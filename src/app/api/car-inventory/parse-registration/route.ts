import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** 探数绿本 OCR API 返回数据 */
interface RegistrationOcrData {
  vin: string;
  is_rule: string;
  car_brand: string;
  car_color: string;
  car_model: string;
  car_owner_info: string;
  car_type: string;
  registration_authority: string;
  registration_date: string;
  registration_number: string;
  use_nature: string;
  issue_authority: string;
  issue_date: string;
  acquisition_method: string;
  displacement: string;
  power: string;
  engine_number: string;
  engine_type: string;
  fuel_type: string;
  is_domestic: string;
  manufacture_date: string;
  manufacture_name: string;
  passenger_capacity: string;
  cab_passenger_capacity: string;
  container_dimension: string;
  overall_dimension: string;
  front_wheel_track: string;
  rear_wheel_track: string;
  spring_number: string;
  steering_form: string;
  tire_number: string;
  tire_size: string;
  permitted_weight: string;
  total_weight: string;
  traction_weight: string;
  axle_number: string;
  wheel_base: string;
  barcode: string;
}

interface TanshuApiResponse {
  code: number;
  msg: string;
  data: RegistrationOcrData;
}

const TANSHU_API_URL = 'https://api2.tanshuapi.com/api/ocr_vehicle_registration/v1/index';
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
  214601: '图片为空，请上传有效图片',
  214602: '图片过大，请压缩后再试（应小于 4MB）',
  214603: '不支持的图片格式',
  214604: '识别失败，请检查图片清晰度',
};

function tanshuErrorMessage(code: number, msg: string): string {
  return TANSHU_ERROR_MAP[code] ?? `${msg} (错误码: ${code})`;
}

/**
 * POST /api/car-inventory/parse-registration
 * 上传绿本（机动车登记证书）图片，调用探数 OCR API 解析返回结构化数据
 *
 * Body: { imageBase64?: string; imageUrl?: string }
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
    const { imageBase64, imageUrl } = body as {
      imageBase64?: string;
      imageUrl?: string;
    };

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: '请提供绿本图片（imageBase64 或 imageUrl）' }, { status: 400 });
    }

    if (!TANSHU_API_KEY) {
      return NextResponse.json({ error: '服务端未配置 TANSHU_API_KEY 环境变量' }, { status: 500 });
    }

    const ocrData = await callRegistrationOcrApi({ imageBase64, imageUrl });
    const mapped = mapRegistrationToFields(ocrData);

    return NextResponse.json({ data: mapped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 调用探数绿本 OCR API */
async function callRegistrationOcrApi(params: {
  imageBase64?: string;
  imageUrl?: string;
}): Promise<RegistrationOcrData> {
  const url = new URL(TANSHU_API_URL);
  url.searchParams.set('key', TANSHU_API_KEY);

  const formData = new FormData();
  if (params.imageBase64) {
    formData.append('img', params.imageBase64);
  }
  if (params.imageUrl) {
    formData.append('img_url', params.imageUrl);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`绿本 OCR 服务异常 (HTTP ${response.status})，请稍后重试`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(`绿本 OCR 返回异常数据: ${text.slice(0, 200)}`);
  }

  const result: TanshuApiResponse = await response.json();

  if (result.code !== 1) {
    const errMsg = tanshuErrorMessage(result.code, result.msg);
    throw new Error(`绿本 OCR 识别失败: ${errMsg}`);
  }

  return result.data;
}

/** 解析 car_owner_info 字段，提取所有人名称和身份证明号码 */
function parseOwnerInfo(carOwnerInfo: string): { ownerName?: string; idNumber?: string } {
  if (!carOwnerInfo) return {};
  // 格式通常为 "张三/居民身份证/110101199001011234" 或 "XX公司/统一社会信用代码/91110000123456789X"
  const parts = carOwnerInfo.split('/');
  if (parts.length >= 1) {
    const ownerName = parts[0]?.trim() || undefined;
    const idNumber = parts.length >= 3 ? parts[2]?.trim() || undefined : undefined;
    return { ownerName, idNumber };
  }
  return { ownerName: carOwnerInfo.trim() || undefined };
}

/** 判断是否为新能源车 */
function isNewEnergy(fuelType: string, carModel: string): boolean {
  const fuel = fuelType.toLowerCase();
  if (fuel.includes('电') || fuel.includes('电动') || fuel.includes('纯电')) return true;
  // 常见新能源品牌/型号特征
  if (/新能源|纯电|混合动力|插电/i.test(carModel)) return true;
  return false;
}

/** 将绿本 OCR 结果映射到车辆档案字段 */
function mapRegistrationToFields(ocr: RegistrationOcrData) {
  const { ownerName, idNumber } = parseOwnerInfo(ocr.car_owner_info);

  return {
    vin: ocr.vin || undefined,
    vin_valid: ocr.is_rule === '1',
    plate_number: ocr.registration_number || undefined,
    vehicle_type: ocr.car_type || undefined,
    owner_name: ownerName || ocr.car_owner_info || undefined,
    id_number: idNumber || undefined,
    usage_nature: ocr.use_nature || undefined,
    brand: ocr.car_brand || undefined,
    model: ocr.car_model || undefined,
    brand_model: [ocr.car_brand, ocr.car_model].filter(Boolean).join('') || undefined,
    engine_number: ocr.engine_number || undefined,
    engine_model: ocr.engine_type || undefined,
    displacement: ocr.displacement || undefined,
    power: ocr.power || undefined,
    fuel_type: ocr.fuel_type || undefined,
    color: ocr.car_color || undefined,
    manufacturer: ocr.manufacture_name || undefined,
    registration_date: ocr.registration_date || undefined,
    registration_authority: ocr.registration_authority || undefined,
    issue_date: ocr.issue_date || undefined,
    issue_authority: ocr.issue_authority || undefined,
    is_new_energy: isNewEnergy(ocr.fuel_type, ocr.car_model || ''),
    acquisition_method: ocr.acquisition_method || undefined,
    steering_type: ocr.steering_form || undefined,
    axles: ocr.axle_number || undefined,
    wheelbase: ocr.wheel_base || undefined,
    tire_count: ocr.tire_number || undefined,
    gross_mass: ocr.total_weight || undefined,
    rated_load: ocr.permitted_weight || undefined,
    towing_capacity: ocr.traction_weight || undefined,
    seating_capacity: ocr.passenger_capacity || undefined,
    dimensions: ocr.overall_dimension || undefined,
    cargo_dimensions: ocr.container_dimension || undefined,
    // 补充字段
    _extra: {
      is_domestic: ocr.is_domestic || undefined,
      manufacture_date: ocr.manufacture_date || undefined,
      cab_passenger_capacity: ocr.cab_passenger_capacity || undefined,
      front_wheel_track: ocr.front_wheel_track || undefined,
      rear_wheel_track: ocr.rear_wheel_track || undefined,
      spring_number: ocr.spring_number || undefined,
      tire_size: ocr.tire_size || undefined,
      barcode: ocr.barcode || undefined,
    },
  };
}