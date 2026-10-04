// VIN 查询 API 配置
// 服务商：碳数科技 VIN 车型库 V4
// 密钥请通过 TANSHU_API_KEY 环境变量配置（也兼容 VIN_API_KEY）
export const VIN_API_CONFIG = {
  baseUrl: "https://api2.tanshuapi.com/api/vin_v4/v1/index",
  apiKey: process.env.TANSHU_API_KEY || process.env.VIN_API_KEY || "",
};
