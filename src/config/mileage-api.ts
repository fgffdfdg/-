/**
 * 碳数科技 - 里程报告 API 配置
 * 文档: POST https://api2.tanshuapi.com/api/car_mileage_v1/v1/index
 *
 * 密钥通过环境变量配置：
 *   TANSHU_API_KEY       —— 与 VIN/出险共用
 *   TANSHU_MILEAGE_KEY   —— （可选）里程专用 key，优先使用
 */
export const MILEAGE_API_CONFIG = {
  baseUrl: "https://api2.tanshuapi.com/api/car_mileage_v1/v1/index",
  apiKey:
    process.env.TANSHU_MILEAGE_KEY ||
    process.env.TANSHU_API_KEY ||
    process.env.VIN_API_KEY ||
    "",
};

/**
 * 服务端运行时的对外基础地址（用于拼装回调 notify_url）。
 */
export function getPublicBaseUrl(): string | undefined {
  const domain =
    process.env.COZE_PROJECT_DOMAIN_DEFAULT ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!domain) return undefined;
  if (domain.startsWith("http://") || domain.startsWith("https://")) return domain;
  return `https://${domain}`;
}
