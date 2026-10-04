import { NextRequest, NextResponse } from "next/server";
import { HeaderUtils } from "coze-coding-dev-sdk";
import { BRAND_DICT, FIELD_KEY_MAP, translateTerm } from "@/lib/auto-terms";
import { callLLM } from "@/lib/llm-client";

interface TranslateRequest {
  data: Record<string, unknown>;
}

/**
 * 字段处理策略
 * - passthrough: 纯数字/型号/编码/日期，不翻译直接原样返回
 * - enum:        固定枚举值，命中本地术语表即返回；未命中则作为兜底走 AI
 * - ai:          自由文本（车型全称/厂商/备注/颜色/车组名），必须走 AI
 */
type FieldStrategy = "passthrough" | "enum" | "ai";

const FIELD_STRATEGY: Record<string, FieldStrategy> = {
  // —— 直传：数字、型号、编码、日期（含中英混合的型号字符串）——
  vin: "passthrough",
  yeartype: "passthrough",        // 年款 2019
  price: "passthrough",           // 价格数字
  len: "passthrough",
  width: "passthrough",
  height: "passthrough",
  wheelbase: "passthrough",
  weight: "passthrough",
  full_weight_max: "passthrough",
  axes_num: "passthrough",
  track_front: "passthrough",
  track_rear: "passthrough",
  seatnum: "passthrough",
  maxpower: "passthrough",
  displacement: "passthrough",
  listdate: "passthrough",        // 2019-10-29
  stop_date: "passthrough",
  enginemodel: "passthrough",     // 发动机型号 EBDA
  model: "passthrough",           // 公告型号 SVW7003AEV
  group_code: "passthrough",

  // —— 枚举：命中术语表直接翻译 ——
  fueltype: "enum",
  fuelgrade: "enum",
  fuelmethod: "enum",
  environmentalstandards: "enum",
  drivemode: "enum",
  gearbox: "enum",
  bodytype: "enum",
  sizetype: "enum",
  sale_state: "enum",

  // —— 自由文本：品牌/车系/车型全称/厂商/颜色/车组名/备注 ——
  brand: "ai",
  typename: "ai",
  name: "ai",
  manufacturer: "ai",
  color: "ai",
  groupname: "ai",
  remark: "ai",
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * 对未命中术语表的枚举值做最后一道"安全直传"：
 * 若值本身已经是英文/数字/符号组合（例如 "DCT"、"EVT"、"AMT"、"Euro 6"），
 * 不需要再丢给 AI，直接原样返回。
 */
function isAlreadyLatin(value: string): boolean {
  // 去掉常见空格/标点后，若不含中日韩字符，认为已是英文
  return !/[\u3400-\u9FBF\u3040-\u30FF\uAC00-\uD7AF]/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const { data } = (await request.json()) as TranslateRequest;
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    if (!data) {
      return NextResponse.json({ error: "缺少数据" }, { status: 400 });
    }

    const translated: Record<string, unknown> = {};
    const aiTasks: Record<string, string> = {};

    // 第一步：按字段策略分发
    for (const [key, value] of Object.entries(data)) {
      // 空值（null/undefined/""/0 除外的 0 不会进来，因为 0 是数字）直接透传
      if (value === null || value === undefined || value === "") {
        translated[key] = value;
        continue;
      }

      const strategy = FIELD_STRATEGY[key] ?? "ai";

      // 品牌 / 厂商：优先查品牌标准译名词典，命中即直出；未命中再走 AI
      if ((key === "brand" || key === "manufacturer") && isNonEmptyString(value)) {
        const brandHit = BRAND_DICT[value.trim()];
        if (brandHit) {
          translated[key] = brandHit;
          continue;
        }
      }

      if (strategy === "passthrough") {
        // 纯数字 / 型号 / 日期：不翻译
        translated[key] = value;
        continue;
      }

      if (!isNonEmptyString(value)) {
        translated[key] = value;
        continue;
      }

      // enum / ai 都先尝试术语表（品牌/车系也可能命中内置表）
      const mapped = translateTerm(value.trim());
      if (mapped !== value.trim()) {
        translated[key] = mapped;
        continue;
      }

      if (strategy === "enum") {
        // 枚举未命中：若本身已是英文/数字则原样返回，否则交给 AI
        if (isAlreadyLatin(value.trim())) {
          translated[key] = value.trim();
        } else {
          aiTasks[key] = value.trim();
          translated[key] = value;
        }
      } else {
        // ai 字段：交给 LLM
        aiTasks[key] = value.trim();
        translated[key] = value;
      }
    }

    // 第二步：批量调用 LLM 翻译剩余字段
    const aiKeys = Object.keys(aiTasks);
    if (aiKeys.length > 0) {
      // 给 AI 提供字段英文标签和上下文，避免把车型/车系翻译错位
      const fieldLabels: Record<string, string> = {
        brand: "Vehicle brand (manufacturer marque)",
        typename: "Vehicle series / model line (e.g. 朗逸 -> Lavida), NOT the full model name",
        name: "Full vehicle model name including year, brand, series, body style, transmission and trim, with the official model code in parentheses preserved",
        manufacturer: "Full legal manufacturer company name",
        color: "Exterior color name",
        groupname: "Internal production group name with date range like '海狮07 EV(24/12-)'",
        remark: "Short remark about transmission / trim / features",
      };
      const lines = aiKeys
        .map((k) => `- ${k} [${fieldLabels[k] || k}]: ${aiTasks[k]}`)
        .join("\n");
      const prompt = `You are a professional automotive translator for used-car export documents. Translate the following Chinese vehicle parameters into concise, industry-standard English.

Rules:
1. Return ONLY a valid JSON object with the EXACT SAME keys (brand, typename, name, manufacturer, color, groupname, remark — whatever appears below).
2. Do NOT merge or duplicate values across fields. In particular:
   - "typename" is ONLY the series name (e.g. 海狮07 EV -> Sea Lion 07 EV), do NOT include year, trim, or model code.
   - "name" is the FULL model name. You may reuse the translated brand and series, but still output the complete name with year / body / transmission / trim and keep the model code in parentheses exactly as in the source.
3. Keep model codes (BYD6486SBEV2, etc.), numbers, dates, and the parentheses containing them unchanged.
4. Translate common trim words: 智航版 -> Smart Navigation Edition, 优享版 -> Enjoyment Edition, 豪华版 -> Luxury Edition, 旗舰版 -> Flagship Edition, 尊贵版 -> Premium Edition.
5. No extra commentary, no markdown fences.

Input fields:
${lines}

Output JSON example: {"brand":"BYD","typename":"Sea Lion 07 EV","name":"2025 BYD Sea Lion 07 EV Fixed Gear Ratio 610 Smart Navigation Edition (BYD6486SBEV2)","manufacturer":"BYD Auto Co., Ltd.","color":"Polar White","groupname":"Sea Lion 07 EV (24/12-)","remark":"Single-speed transmission, Smart Navigation Edition"}`;

      try {
        const response = await callLLM(
          [
            {
              role: "system",
              content:
                "You are a professional automotive translator. Translate Chinese to English accurately and concisely. Return only a valid JSON object, no markdown, no commentary.",
            },
            { role: "user", content: prompt },
          ],
          {
            model: "doubao-seed-2-0-mini-260215",
            temperature: 0.2,
            thinking: "disabled",
          },
          customHeaders
        );

        let parsed: unknown = response;
        if (typeof response === "string") {
          // 容错：去掉可能的 ```json 包裹
          const cleaned = response
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          parsed = JSON.parse(cleaned);
        }
        if (parsed && typeof parsed === "object") {
          for (const key of aiKeys) {
            const v = (parsed as Record<string, unknown>)[key];
            if (typeof v === "string" && v.trim().length > 0) {
              translated[key] = v.trim();
            }
          }
        }
      } catch (e) {
        console.error("[Translate] AI 翻译失败:", e);
        // 失败时保留原值（中文），不影响接口整体返回
      }
    }

    // 第三步：字段名翻译（中文 key → 英文 key）
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(translated)) {
      const englishKey = FIELD_KEY_MAP[key] || key;
      result[englishKey] = value;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[Translate] 翻译失败:", error);
    return NextResponse.json(
      { error: "翻译失败，请稍后重试" },
      { status: 500 }
    );
  }
}
