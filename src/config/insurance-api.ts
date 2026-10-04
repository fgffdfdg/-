/**
 * 碳数出险报告 API 配置
 * 服务商：碳数科技 · 车辆保险记录 V4
 * 文档：POST https://api2.tanshuapi.com/api/car_insurance_v4/v1/index
 *
 * 密钥通过环境变量配置：
 *   TANSHU_API_KEY        —— 与 VIN 查询共用
 *   TANSHU_INSURANCE_KEY  —— （可选）出险专用 key，优先使用
 */
export const INSURANCE_API_CONFIG = {
  baseUrl: "https://api2.tanshuapi.com/api/car_insurance_v4/v1/index",
  apiKey:
    process.env.TANSHU_INSURANCE_KEY ||
    process.env.TANSHU_API_KEY ||
    process.env.VIN_API_KEY ||
    "",
};

/**
 * 服务端运行时的对外基础地址（用于拼装回调 notify_url）。
 * 优先使用平台注入的项目域名；本地开发时留空，轮询兜底。
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
