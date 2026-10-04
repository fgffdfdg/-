import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { VIN_API_CONFIG } from "@/config/vin-api";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

interface TanshuApiResponse {
  code: number;
  msg?: string;
  data?: Record<string, unknown>;
}

/**
 * 从 .env.local 读取密钥的 fallback：
 * 优先使用环境变量（由平台注入），其次从项目根 .env.local 中读取 TANSHU_API_KEY。
 */
function loadApiKey(): string {
  const fromEnv = process.env.TANSHU_API_KEY || process.env.VIN_API_KEY || VIN_API_CONFIG.apiKey;
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
          if (key === "TANSHU_API_KEY" || key === "VIN_API_KEY") {
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (val) {
              console.log("[VIN] api key fallback loaded from:", p);
              return val;
            }
          }
        }
      }
    }
    console.warn("[VIN] TANSHU_API_KEY not found in env or .env.local");
  } catch (e) {
    console.warn("[VIN] load api key fallback failed:", e instanceof Error ? e.message : e);
  }
  return "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitSize(size?: string): { len?: string; width?: string; height?: string } {
  if (!size) return {};
  const parts = size.split(/[*xX×]/).map((s) => s.trim()).filter(Boolean);
  return {
    len: parts[0],
    width: parts[1],
    height: parts[2],
  };
}

function toStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/**
 * 将碳数 API 返回字段映射为前端 VinData 结构，保持页面字段命名不变。
 */
function mapTanshuData(d: Record<string, unknown>) {
  const { len, width, height } = splitSize(toStr(d.size));
  const saleState = toStr(d.sale_state);
  return {
    vin: toStr(d.vin),
    brand: toStr(d.brand_name),
    typename: toStr(d.series_name),
    groupname: toStr(d.group_name),
    name: toStr(d.name),
    yeartype: toStr(d.year),
    price: toStr(d.price),
    gearbox: toStr(d.gearbox),
    enginemodel: toStr(d.engine_model),
    drivemode: toStr(d.driven_type),
    displacement: toStr(d.displacement),
    environmentalstandards: toStr(d.effluent_standard),
    sizetype: toStr(d.scale),
    bodytype: toStr(d.number_of_carriages),
    seatnum: toStr(d.zws),
    listdate: toStr(d.market_date),
    len,
    width,
    height,
    wheelbase: toStr(d.wheelbase),
    weight: toStr(d.full_weight),
    fueltype: toStr(d.power_type),
    fuelgrade: toStr(d.oil_num),
    fuelmethod: toStr(d.fueljet_type),
    maxpower: toStr(d.maxpower),
    manufacturer: toStr(d.manufacturer),
    model: toStr(d.model),
    color: toStr(d.color),
    stop_date: toStr(d.stop_date),
    axes_num: toStr(d.axes_num),
    track_front: toStr(d.track_front),
    track_rear: toStr(d.track_rear),
    full_weight_max: toStr(d.full_weight_max),
    group_code: toStr(d.group_code),
    remark: toStr(d.remark),
    sale_state: saleState,
  };
}

async function queryVin(vin: string) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "VIN API 未配置密钥，请设置 TANSHU_API_KEY 环境变量" },
      { status: 500 }
    );
  }

  const url = `${VIN_API_CONFIG.baseUrl}?key=${encodeURIComponent(apiKey)}&vin=${encodeURIComponent(vin)}`;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = (await res.json()) as TanshuApiResponse;
        // 碳数约定：code=1 成功；其他为业务失败（如查无此车，不扣次数）
        if (json.code === 1 && json.data) {
          return NextResponse.json({ success: true, data: mapTanshuData(json.data) });
        }
        return NextResponse.json(
          { error: json.msg || "未找到该 VIN 码对应的车辆信息" },
          { status: 400 }
        );
      }

      if (res.status === 401 || res.status === 402 || res.status === 429 || res.status >= 500) {
        const text = await res.text();
        lastError = `API 返回 ${res.status}: ${text}`;
        console.warn(`[VIN] 第 ${attempt} 次请求失败 (${res.status}), ${text}`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      } else {
        const text = await res.text();
        return NextResponse.json(
          { error: `API 请求失败 (${res.status}): ${text}` },
          { status: res.status }
        );
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "请求异常";
      console.warn(`[VIN] 第 ${attempt} 次请求异常: ${lastError}`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }

  console.error(`[VIN] VIN ${vin} 查询最终失败: ${lastError}`);
  return NextResponse.json(
    { error: `查询失败，请稍后重试 (${lastError})` },
    { status: 502 }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get("vin");

  if (!vin) {
    return NextResponse.json({ error: "缺少 VIN 码" }, { status: 400 });
  }

  return queryVin(vin);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const vin = body?.vin as string | undefined;

  if (!vin) {
    return NextResponse.json({ error: "缺少 VIN 码" }, { status: 400 });
  }

  return queryVin(vin);
}
