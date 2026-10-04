import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 探数行驶证 OCR API 返回的正面数据 */
interface LicenseFrontData {
  side: 'front';
  vin: string;
  address: string;
  department: string;
  vehicle_type: string;
  vehicle_type_code: string;
  car_model: string;
  issue_date: string;
  owner: string;
  lp_num: string;
  lp_prefix: string;
  use_type: string;
  eng_num: string;
  register_date: string;
}

/** 探数行驶证 OCR API 返回的反面数据 */
interface LicenseBackData {
  side: 'back';
  insp_record: string;
  approved_weirht: string;
  unload_weight: string;
  car_size: string;
  approved_passenger_num: string;
  total_mass: string;
  rylx: string;
  traction_weight: string;
  remark: string;
  dnbh: string;
  lp_num: string;
  lp_prefix: string;
  zxbh: string;
}

type LicenseOcrData = LicenseFrontData | LicenseBackData;

interface TanshuApiResponse {
  code: number;
  msg: string;
  data: LicenseOcrData;
}

const TANSHU_API_URL = 'https://api2.tanshuapi.com/api/ocr_vehicle_license/v1/index';
const TANSHU_API_KEY = process.env.TANSHU_API_KEY ?? '';

/** 探数 API 错误码映射 */
const TANSHU_ERROR_MAP: Record<number, string> = {
  10001: 'API Key 无效，请检查环境变量配置',
  10002: 'API Key 无请求权限',
  10003: 'API Key 已过期',
  10004: '未知的请求来源',
  10005: 'IP 被禁止访问',
  10006: 'API Key 被禁用',
  10007: '请求超过次数限制',
  10008: '接口维护中，请稍后重试',
  209501: '图片为空，请上传有效图片',
  209502: '图片过大，请压缩后再试（应小于 4MB）',
  209503: '不支持的图片格式',
  209504: '识别失败，请检查图片清晰度',
};

function tanshuErrorMessage(code: number, msg: string): string {
  return TANSHU_ERROR_MAP[code] ?? `${msg} (错误码: ${code})`;
}

/**
 * POST /api/car-inventory/parse-license
 * 上传行驶证图片，调用探数 OCR API 解析返回结构化数据
 *
 * Body: { imageBase64?: string; imageUrl?: string; side?: 'front' | 'back' }
 * - imageBase64 / imageUrl 二选一
 * - side 默认 "front"
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }
    const client = getSupabaseClient(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, imageUrl, side = 'front' } = body as {
      imageBase64?: string;
      imageUrl?: string;
      side?: 'front' | 'back';
    };

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: '请提供行驶证图片（imageBase64 或 imageUrl）' }, { status: 400 });
    }

    if (!TANSHU_API_KEY) {
      return NextResponse.json({ error: '服务端未配置 TANSHU_API_KEY 环境变量' }, { status: 500 });
    }

    // 调用探数行驶证 OCR API
    const ocrData = await callLicenseOcrApi({ imageBase64, imageUrl, side });
    // 映射到车辆档案字段
    const mapped = mapLicenseToFields(ocrData);

    return NextResponse.json({ data: mapped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 调用探数行驶证 OCR API */
async function callLicenseOcrApi(params: {
  imageBase64?: string;
  imageUrl?: string;
  side: 'front' | 'back';
}): Promise<LicenseOcrData> {
  const url = new URL(TANSHU_API_URL);
  url.searchParams.set('key', TANSHU_API_KEY);

  const formData = new FormData();
  if (params.imageBase64) {
    formData.append('img', params.imageBase64);
  }
  if (params.imageUrl) {
    formData.append('img_url', params.imageUrl);
  }
  formData.append('side', params.side);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`行驶证 OCR 服务异常 (HTTP ${response.status})，请稍后重试`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(`行驶证 OCR 返回异常数据: ${text.slice(0, 200)}`);
  }

  const result: TanshuApiResponse = await response.json();

  if (result.code !== 1) {
    const errMsg = tanshuErrorMessage(result.code, result.msg);
    throw new Error(`行驶证 OCR 识别失败: ${errMsg}`);
  }

  return result.data;
}

/** 将 OCR 结果映射到车辆档案字段 */
function mapLicenseToFields(ocr: LicenseOcrData) {
  // 拼接完整号牌
  const plateNumber = [ocr.lp_prefix, ocr.lp_num].filter(Boolean).join('');

  if (ocr.side === 'front') {
    return {
      side: 'front' as const,
      plate_number: plateNumber || undefined,
      vehicle_type: ocr.vehicle_type || undefined,
      owner_name: ocr.owner || undefined,
      owner_address: ocr.address || undefined,
      usage_nature: ocr.use_type || undefined,
      brand_model: ocr.car_model || undefined,
      vin: ocr.vin || undefined,
      engine_number: ocr.eng_num || undefined,
      registration_date: ocr.register_date || undefined,
      issue_date: ocr.issue_date || undefined,
      registration_authority: ocr.department || undefined,
    };
  }

  return {
    side: 'back' as const,
    plate_number: plateNumber || undefined,
    curb_weight: ocr.unload_weight || undefined,
    gross_mass: ocr.total_mass || undefined,
    rated_load: ocr.approved_weirht || undefined,
    seating_capacity: ocr.approved_passenger_num || undefined,
    dimensions: ocr.car_size || undefined,
    fuel_type: ocr.rylx || undefined,
    towing_capacity: ocr.traction_weight || undefined,
    notes: ocr.remark || undefined,
    // 补充字段存入 custom_fields 扩展
    _extra: {
      insp_record: ocr.insp_record || undefined,
      dnbh: ocr.dnbh || undefined,
      zxbh: ocr.zxbh || undefined,
    },
  };
}