import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { callLLM } from '@/lib/llm-client';

interface ExtractRequest {
  imageData: string; // base64 data URL
}

interface AIVehicleInfo {
  vin?: string;
  brand?: string;
  brandEn?: string;
  model?: string;
  modelEn?: string;
  year?: string;
  color?: string;
  energyType?: string;
  bodyType?: string;
  power?: string;
  netWeight?: number;
  grossWeight?: number;
  engineNo?: string;
  plateNo?: string;
  useCharacter?: string;
  bodyStructure?: string;
  seatingCapacity?: string;
  lengthMm?: number | string;
  widthMm?: number | string;
  heightMm?: number | string;
  mileageKm?: number | string;
  fuelTypeCn?: string;
  fuelTypeEn?: string;
  // 登记证特有字段
  registerDate?: string;
  issueDate?: string;
}

const PROMPT = `你是一名专业的二手车出口单证员，擅长识别中国机动车登记证书（大绿本）和机动车行驶证（小蓝本）。

请仔细观察用户上传的图片，识别其中的车辆信息，并严格以 JSON 返回（不要 markdown、不要解释）。

识别字段（缺失字段返回 null，不要编造）：
1. vin: 车辆识别代号 / VIN，17位字母数字，大写，去除空格
2. brand: 中文品牌（如"丰田"、"别克"）
3. model: 英文/型号（如"Camry"、"GL8"，若证件上是中文型号则原样给中文型号）
4. year: 出厂年份，四位数字字符串（如 "2020"）。不要用注册日期当年份
5. color: 车身颜色（中文，如"白色"、"黑色"）
6. energyType: 能源类型，统一映射为下列英文之一：
   - 汽油 → "Gasoline"
   - 柴油 → "Diesel"
   - 纯电动 → "Battery Electric"
   - 插电混动 → "Plug-in Hybrid"
   - 普通混动 / 混合动力（非插电）→ "Hybrid"
   - 增程式 → "Range-Extended Electric"
   - 无法判断 → null
7. bodyType: 车辆类型，映射为下列英文之一：
   - 普通轿车 / 三厢车 → "Sedan"
   - 两厢车 → "Hatchback"
   - SUV / 越野 → "SUV"
   - MPV / 商务车 / 面包车 → "MPV"
   - 皮卡 → "Pickup"
   - 货车 / 客车 / 商用车辆 → "Commercial Vehicle"
   - 不确定的乘用车 → "Passenger Vehicle"
   - 其他 → null
8. power: 发动机功率，单位 kW，数字字符串（如 "135"）。没有则 null
9. netWeight: 整备质量（kg），整数
10. grossWeight: 总质量（kg），整数
11. engineNo: 发动机号
12. plateNo: 号牌号码（如"京A12345"）
13. useCharacter: 使用性质（如"非营运"）
14. registerDate: 注册登记日期（YYYY-MM-DD）
15. issueDate: 发证日期（YYYY-MM-DD）

以下字段如证件上有则提取，没有返回 null（用于出口许可证附加信息表）：
16. brandEn: 品牌英文（证件上若有英文品牌名，如"Wuling"；没有则返回 null，不要翻译）
17. modelEn: 车型英文（证件上若有英文型号，如"Hongguang MINIEV"；没有返回 null）
18. bodyStructure: 车身结构（如"5门4座两厢车"、"4门5座三厢车"）
19. seatingCapacity: 核定载客人数字符串（如"4"、"5"）
20. lengthMm: 车辆长度，数字，单位 mm（如 3256），不要带单位
21. widthMm: 车辆宽度，数字，单位 mm（如 1510）
22. heightMm: 车辆高度，数字，单位 mm（如 1578）
23. mileageKm: 里程表读数，数字，单位 km（如 300）。新车或证件无里程则返回 null
24. fuelTypeCn: 燃料类型（中文原文，如"电动"、"汽油"、"柴油"、"混合动力"）
25. fuelTypeEn: 燃料类型英文（如"Battery EV"、"Gasoline"、"Diesel"、"Hybrid"）

注意：
- VIN 必须 17 位、不包含 I/O/Q 字母；若识别到的字符可疑，按真实字符给
- 中文品牌保留中文，不要翻译成英文
- 数字字段只返回数字（字符串/数字均可），不要带单位、逗号、空格
- 若图片不是登记证/行驶证，返回 { "error": "未识别到车辆证件" }
- 只返回 JSON

返回示例：
{
  "vin": "LK6ADAE23SE599953",
  "brand": "五菱",
  "brandEn": "Wuling",
  "model": "宏光MINI EV",
  "modelEn": "Hongguang MINIEV",
  "year": "2024",
  "color": "白色",
  "energyType": "Battery Electric",
  "bodyType": "Hatchback",
  "power": "20",
  "netWeight": 780,
  "grossWeight": 1100,
  "engineNo": "WSS5041043",
  "plateNo": "粤B12345",
  "useCharacter": "非营运",
  "bodyStructure": "5门4座两厢车",
  "seatingCapacity": "4",
  "lengthMm": 3256,
  "widthMm": 1510,
  "heightMm": 1578,
  "mileageKm": 300,
  "fuelTypeCn": "电动",
  "fuelTypeEn": "Battery EV",
  "registerDate": "2024-05-10",
  "issueDate": "2024-05-10"
}`;

function extractJson(content: string): AIVehicleInfo & { error?: string } {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式异常');
  return JSON.parse(match[0]) as AIVehicleInfo & { error?: string };
}

function sanitizeVin(vin?: string): string {
  if (!vin) return '';
  return vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

function sanitizeNum(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[^\d.]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const { imageData } = (await request.json()) as ExtractRequest;
    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }
    if (imageData.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: '图片过大（>8MB），请压缩后再试' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const content = await callLLM(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      {
        model: 'doubao-seed-2-0-lite-260215',
        temperature: 0.1,
      },
      customHeaders,
    );

    const parsed = extractJson(content);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    const result = {
      vin: sanitizeVin(parsed.vin),
      brand: (parsed.brand || '').trim(),
      brandEn: (parsed.brandEn || '').trim(),
      model: (parsed.model || '').trim(),
      modelEn: (parsed.modelEn || '').trim(),
      year: (parsed.year || '').trim(),
      color: (parsed.color || '').trim(),
      energyType: parsed.energyType || null,
      bodyType: parsed.bodyType || null,
      power: sanitizeNum(parsed.power),
      netWeight: typeof parsed.netWeight === 'number' ? parsed.netWeight : null,
      grossWeight: typeof parsed.grossWeight === 'number' ? parsed.grossWeight : null,
      engineNo: (parsed.engineNo || '').trim(),
      plateNo: (parsed.plateNo || '').trim(),
      useCharacter: (parsed.useCharacter || '').trim(),
      bodyStructure: (parsed.bodyStructure || '').trim(),
      seatingCapacity: sanitizeNum(parsed.seatingCapacity),
      lengthMm: sanitizeNum(parsed.lengthMm),
      widthMm: sanitizeNum(parsed.widthMm),
      heightMm: sanitizeNum(parsed.heightMm),
      mileageKm: sanitizeNum(parsed.mileageKm),
      fuelTypeCn: (parsed.fuelTypeCn || '').trim(),
      fuelTypeEn: (parsed.fuelTypeEn || '').trim(),
      registerDate: parsed.registerDate || null,
      issueDate: parsed.issueDate || null,
    };

    if (!result.vin && !result.brand && !result.plateNo) {
      return NextResponse.json(
        { error: '未能从图片中识别到有效车辆信息，请上传更清晰的登记证或行驶证照片' },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[Extract Vehicle] Error:', error);
    const message = error instanceof Error ? error.message : '识别失败';
    return NextResponse.json({ error: `识别失败：${message}` }, { status: 500 });
  }
}
