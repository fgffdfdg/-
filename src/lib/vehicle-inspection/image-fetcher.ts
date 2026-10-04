/**
 * 服务端图片获取与 base64 转换工具。
 *
 * 专用于 insurance / mileage / battery 等检测 API 的服务端调用，
 * 避免浏览器端因 S3 CORS 策略导致跨域拦截。
 */
import { getS3Storage } from "@/lib/s3";

const MAX_IMG_BYTES = 4 * 1024 * 1024;

/**
 * 根据 S3 key 或完整 URL 获取图片并转为 base64 字符串。
 *
 * @param imageKeyOrUrl - S3 key（如 "car-inventory/xxx.jpg"）或完整 http(s) URL
 * @returns base64 字符串（不含 data: 前缀）
 * @throws 如果获取失败或图片超过 4MB
 */
export async function fetchImageAsBase64Server(imageKeyOrUrl: string): Promise<string> {
  let url: string;

  if (imageKeyOrUrl.startsWith("http://") || imageKeyOrUrl.startsWith("https://")) {
    // 已是完整 URL，直接使用
    url = imageKeyOrUrl;
  } else if (imageKeyOrUrl.startsWith("data:")) {
    // 已是 data URL，提取 base64
    const comma = imageKeyOrUrl.indexOf(",");
    return comma >= 0 ? imageKeyOrUrl.slice(comma + 1) : imageKeyOrUrl;
  } else {
    // S3 key，生成签名 URL
    const storage = getS3Storage();
    url = await storage.generatePresignedUrl({
      key: imageKeyOrUrl,
      expireTime: 300, // 5 分钟，仅用于服务端瞬间获取
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`图片获取失败：HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    const arrayBuffer = await res.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_IMG_BYTES) {
      throw new Error("行驶证图片不能超过 4MB");
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return base64;
  } finally {
    clearTimeout(timeout);
  }
}