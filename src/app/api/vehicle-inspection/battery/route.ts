import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BATTERY_API_CONFIG } from '@/config/battery-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TanshuBatteryResponse {
  code: number;
  msg: string;
  data?: unknown;
}

/** 系统级错误（Key、权限、限流）可重试 */
const SYSTEM_ERROR_CODES = new Set([10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008]);

function isSystemError(code: number): boolean {
  return SYSTEM_ERROR_CODES.has(code);
}

/**
 * 电池 API Key 加载（含 .env.local 兜底，与 insurance/mileage 一致）
 */
function loadBatteryApiKey(): string {
  // 优先从环境变量读取
  const fromEnv =
    process.env.TANSHU_BATTERY_KEY ||
    process.env.TANSHU_API_KEY ||
    '';
  if (fromEnv) return fromEnv;

  // 兜底：从 .env.local 文件直接读取
  try {
    const possiblePaths = [
      path.join(process.cwd(), '.env.local'),
      path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', '.env.local'),
      '/workspace/projects/.env.local',
    ];
    for (const p of possiblePaths) {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          if (
            key === 'TANSHU_BATTERY_KEY' ||
            key === 'TANSHU_API_KEY'
          ) {
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, '');
            if (val) return val;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[battery] load api key fallback failed:', e);
  }
  return '';
}

/**
 * 碳数电池 API 错误码 → 用户友好提示
 */
function friendlyBatteryError(code: number, msg: string): string {
  const map: Record<number, string> = {
    10001: 'API Key 无效，请联系管理员检查 TANSHU_API_KEY 配置',
    10002: 'API Key 已过期或未开通此接口',
    10003: '请求频率过高，请稍后重试',
    10004: '账户余额不足，请联系管理员充值',
    10005: '账户已被禁用',
    10006: 'IP 不在白名单中',
    10007: '接口未授权，请联系管理员开通电池健康查询权限',
    10008: '服务暂时不可用，请稍后重试',
    215801: '未查询到该车辆的电池健康数据',
    215802: '该 VIN 码暂不支持电池健康查询',
    215803: '未查询到该车辆的电池健康数据（可能该车型不支持或数据未收录）',
    215804: '参数错误，请检查 VIN 码格式',
  };
  if (map[code]) return map[code];
  // 系统错误可重试
  if (code >= 10000 && code < 10100) return `服务暂时繁忙（${code}），请稍后重试`;
  return msg || `电池健康查询失败（错误码 ${code}）`;
}

async function callBatteryApi(vin: string): Promise<TanshuBatteryResponse> {
  const key = loadBatteryApiKey();
  if (!key) {
    return { code: -1, msg: '服务端未配置电池 API Key，请联系管理员设置 TANSHU_BATTERY_KEY 或 TANSHU_API_KEY' };
  }

  const url = new URL(BATTERY_API_CONFIG.path, BATTERY_API_CONFIG.baseUrl);
  url.searchParams.set('key', key);
  url.searchParams.set('vin', vin);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json: TanshuBatteryResponse;
    try {
      json = JSON.parse(text) as TanshuBatteryResponse;
    } catch {
      return { code: -2, msg: `上游返回非 JSON：${text.slice(0, 200)}` };
    }
    return json;
  } catch (err) {
    return { code: -3, msg: `请求碳数电池接口失败：${(err as Error).message}` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { vin?: string; plateNumber?: string };
    const vin = (body.vin || '').trim().toUpperCase();

    if (!vin) {
      return NextResponse.json({ error: 'VIN 码为必填项' }, { status: 400 });
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return NextResponse.json({ error: 'VIN 码格式不正确（需 17 位字母数字，不含 I/O/Q）' }, { status: 400 });
    }

    // 电池接口为同步接口，最多重试 2 次系统错误
    let last: TanshuBatteryResponse | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callBatteryApi(vin);
      last = result;
      if (result.code === 1) break;
      if (!isSystemError(result.code)) break;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }

    if (!last || last.code !== 1) {
      const code = last?.code ?? -1;
      const friendlyMsg = friendlyBatteryError(code, last?.msg || '电池健康查询失败');
      console.error(`[battery-api] 查询失败 vin=${vin} code=${code} msg=${last?.msg}`);
      return NextResponse.json(
        { error: friendlyMsg, code },
        { status: code >= 10000 && code < 10100 ? 502 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: last.data,
    });
  } catch (err) {
    console.error('[battery-api] 处理失败：', err);
    return NextResponse.json({ error: '服务异常，请稍后重试' }, { status: 500 });
  }
}
