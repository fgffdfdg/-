// 碳数科技 - 电池健康状态 V2 接口配置
// 接口文档：https://api2.tanshuapi.com/api/car_battery_state_v2/v1/index
// 同步 GET 接口，查得计费

export const BATTERY_API_CONFIG = {
  baseUrl: 'https://api2.tanshuapi.com',
  path: '/api/car_battery_state_v2/v1/index',
  method: 'GET' as const,
};

/**
 * 读取电池接口 Key。
 * 优先使用独立的 TANSHU_BATTERY_KEY；未配置时回落到 TANSHU_API_KEY，便于用户一个 Key 开通多个接口。
 */
export function getBatteryApiKey(): string {
  return (
    process.env.TANSHU_BATTERY_KEY ||
    process.env.TANSHU_API_KEY ||
    process.env.NEXT_PUBLIC_TANSHU_BATTERY_KEY ||
    process.env.NEXT_PUBLIC_TANSHU_API_KEY ||
    ''
  );
}
