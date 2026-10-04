import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { INSURANCE_API_CONFIG, getPublicBaseUrl } from "@/config/insurance-api";
import { createOrder } from "@/lib/vehicle-inspection/insurance-orders";
import { fetchImageAsBase64Server } from "@/lib/vehicle-inspection/image-fetcher";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const MAX_IMG_BYTES = 4 * 1024 * 1024;

/**
 * 与 vin-lookup 相同的兜底：优先环境变量，其次从 .env.local 读取
 */
function loadApiKey(): string {
  const fromEnv = INSURANCE_API_CONFIG.apiKey;
  if (fromEnv) return fromEnv;

  try {
    const possiblePaths = [
      path.join(process.cwd(), ".env.local"),
      path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", ".env.local"),
      "/workspace/projects/.env.local",
    ];
    for (const p of possiblePaths) {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          if (
            key === "TANSHU_INSURANCE_KEY" ||
            key === "TANSHU_API_KEY" ||
            key === "VIN_API_KEY"
          ) {
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (val) return val;
          }
        }
      }
    }
  } catch (e) {
    console.warn("[insurance] load api key fallback failed:", e);
  }
  return "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 去掉 dataURL 前缀，估算 base64 实际字节大小
 */
function stripDataUrlPrefix(s: string): string {
  const comma = s.indexOf(",");
  if (s.startsWith("data:") && comma >= 0) return s.slice(comma + 1);
  return s;
}

function base64ByteLength(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
}

interface TanshuSubmitResponse {
  code: number;
  msg?: string;
  data?: {
    vin?: string;
    order_id?: string;
  };
}

async function submitToTanshu(params: {
  apiKey: string;
  imgBase64: string;
  vin?: string;
  notifyUrl?: string;
}): Promise<{ ok: true; orderId: string; vin?: string } | { ok: false; error: string; status: number }> {
  const form = new URLSearchParams();
  form.set("key", params.apiKey);
  form.set("img_base64", params.imgBase64);
  if (params.vin) form.set("vin", params.vin);
  if (params.notifyUrl) form.set("notify_url", params.notifyUrl);

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(INSURANCE_API_CONFIG.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      let json: TanshuSubmitResponse | null = null;
      try {
        json = JSON.parse(text) as TanshuSubmitResponse;
      } catch {
        // non-json
      }

      if (res.ok && json?.code === 1 && json.data?.order_id) {
        return { ok: true, orderId: json.data.order_id, vin: json.data.vin };
      }

      // 业务失败（215901 下单失败 / 215902 查无记录 / 215903 查询失败；100xx 系统错误）
      if (json?.code) {
        // 系统级错误（100xx）可以重试，其他业务错误直接返回
        if (json.code >= 10000 && json.code < 10100 && attempt < MAX_RETRIES) {
          lastError = json.msg || `上游错误 ${json.code}`;
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        return {
          ok: false,
          status: res.status >= 400 ? res.status : 400,
          error: json.msg || `上游返回错误码 ${json.code}`,
        };
      }

      lastError = `上游 HTTP ${res.status}: ${text.slice(0, 200)}`;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "请求异常";
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }

  return { ok: false, status: 502, error: `提交失败：${lastError}` };
}

export async function POST(request: NextRequest) {
  let body: { img_base64?: string; vin?: string; driving_license_image_url?: string };
  try {
    body = (await request.json()) as { img_base64?: string; vin?: string; driving_license_image_url?: string };
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const vin = body.vin?.trim().toUpperCase();
  let rawImg = (body.img_base64 || "").trim();

  // 如果前端没传 base64（例如 CORS 导致浏览器端获取失败），则服务端从 S3 获取
  if (!rawImg && body.driving_license_image_url) {
    try {
      rawImg = await fetchImageAsBase64Server(body.driving_license_image_url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "图片获取失败";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  if (!rawImg) {
    return NextResponse.json({ error: "缺少行驶证正面照片（img_base64 或 driving_license_image_url）" }, { status: 400 });
  }

  const imgBase64 = stripDataUrlPrefix(rawImg);
  if (base64ByteLength(imgBase64) > MAX_IMG_BYTES) {
    return NextResponse.json({ error: "行驶证图片不能超过 4MB" }, { status: 400 });
  }

  const apiKey = loadApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "出险查询 API Key 未配置，请联系管理员设置 TANSHU_INSURANCE_KEY 或 TANSHU_API_KEY" },
      { status: 500 }
    );
  }

  const publicBase = getPublicBaseUrl();
  const notifyUrl = publicBase
    ? `${publicBase}/api/vehicle-inspection/insurance/callback`
    : undefined;

  const result = await submitToTanshu({
    apiKey,
    imgBase64,
    vin,
    notifyUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 登记订单，等待回调写入或前端轮询
  createOrder(result.orderId, result.vin ?? vin);

  return NextResponse.json({
    success: true,
    order_id: result.orderId,
    vin: result.vin ?? vin,
    notify_url_configured: Boolean(notifyUrl),
  });
}
