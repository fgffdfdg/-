import { NextResponse } from 'next/server';
import carriersData from '@/lib/tracking/weiyun-carriers.json';

// 常见集装箱 SCAC 前缀 → 承运商匹配
const CONTAINER_PREFIX_MAP: Record<string, string> = {
  MSDU: 'MSC', MSCU: 'MSC', MEDU: 'MSC',
  MAEU: 'MAERSK', MRKU: 'MAERSK', MSKU: 'MAERSK', PONU: 'MAERSK',
  COSU: 'COSCO', CCLU: 'COSCO', CSLU: 'COSCO', CBHU: 'COSCO',
  CMAU: 'CMA-CGM', CMDU: 'CMA-CGM', ECMU: 'CMA-CGM',
  EMCU: 'EVERGREEN', EGSU: 'EVERGREEN',
  HLCU: 'HAPAG-LLOYD', HLXU: 'HAPAG-LLOYD',
  ONEU: 'ONE', ONER: 'ONE',
  YMLU: 'YANG MING', YMMU: 'YANG MING',
  OOLU: 'OOCL',
  HMMU: 'HMM',
  ZIMU: 'ZIM',
  NYKU: 'NYK', NYCU: 'NYK',
  KKFU: 'K LINE',
  MOLU: 'MOL',
  APLU: 'APL',
  SUDU: 'HAMBURG SUD',
  TCLU: 'T.S. LINES',
  WHLU: 'WAN HAI',
  SITU: 'SITC',
  KMTU: 'KMTC',
  BMOU: 'BMC',
  FSCU: 'FESCO',
  GESU: 'GES',
};

// 提单号格式 → 承运商匹配
const BL_PATTERNS: Array<{ pattern: RegExp; carrier: string }> = [
  { pattern: /^[A-Z]{4}\d{7,}$/, carrier: '__container__' }, // 可能是集装箱号格式
  { pattern: /^COSU\d{10,}$/, carrier: 'COSCO' },
  { pattern: /^MEDU[A-Z0-9]{6,}$/, carrier: 'MSC' },
  // 常见提单号格式，通用，不匹配特定承运商
];

// 快递单号格式检测
const EXPRESS_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /^[0-9]{10,12}$/, code: 'dhl' },
  { pattern: /^[0-9]{12}$/, code: 'fedex' },
  { pattern: /^1Z[A-Z0-9]{16}$/, code: 'ups' },
  { pattern: /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/, code: 'ems' },
  { pattern: /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/, code: 'china-ems' },
  { pattern: /^SF[0-9]{12}$/, code: 'sfb2c' },
  { pattern: /^YT[0-9]{10,}$/, code: 'yunexpress' },
];

function detectTrackingType(trackingNo: string): 'container' | 'express' | 'bl' | 'unknown' {
  const cleaned = trackingNo.trim().toUpperCase();
  // 集装箱号: 4字母 + 7数字
  if (/^[A-Z]{4}\d{7}$/.test(cleaned)) {
    return 'container';
  }
  // 快递单号检测
  for (const ep of EXPRESS_PATTERNS) {
    if (ep.pattern.test(cleaned)) {
      return 'express';
    }
  }
  // 提单号: 通常包含字母和数字混合
  if (/^[A-Z0-9]{10,}$/.test(cleaned) && /[A-Z]/.test(cleaned) && /\d/.test(cleaned)) {
    return 'bl';
  }
  return 'unknown';
}

function findCarrierByContainerPrefix(prefix: string): string | null {
  return CONTAINER_PREFIX_MAP[prefix] || null;
}

function findCarrierInData(carrierName: string): { trackUrl: string; carrierName: string; carrierCode: string } | null {
  const upperName = carrierName.toUpperCase();
  
  // 先在船公司中查找
  const shipLine = carriersData.shipLines.find(
    s => s.cnName.toUpperCase().includes(upperName) ||
         s.enName.toUpperCase().includes(upperName) ||
         s.code.toUpperCase() === upperName
  );
  if (shipLine) {
    // 船公司通常没有 {0} 占位符的跟踪 URL
    // 尝试构造跟踪 URL
    let trackUrl = shipLine.cnWebsite || shipLine.enWebsite;
    return {
      trackUrl,
      carrierName: shipLine.cnName,
      carrierCode: shipLine.code,
    };
  }
  
  // 再在快递中查找
  const express = carriersData.expresses.find(
    e => e.cnName.toUpperCase().includes(upperName) ||
         e.enName.toUpperCase().includes(upperName) ||
         e.code.toUpperCase() === upperName
  );
  if (express) {
    return {
      trackUrl: express.cnUrl || express.enUrl,
      carrierName: express.cnName,
      carrierCode: express.code,
    };
  }
  
  return null;
}

export async function POST(request: Request) {
  try {
    const { trackingNo } = await request.json();
    if (!trackingNo || typeof trackingNo !== 'string') {
      return NextResponse.json({ success: false, error: '缺少 trackingNo 参数' }, { status: 400 });
    }

    const cleaned = trackingNo.trim().toUpperCase();
    const type = detectTrackingType(cleaned);

    let trackUrl: string | null = null;
    let carrierName: string | null = null;
    let carrierCode: string | null = null;

    if (type === 'container') {
      // 集装箱号：提取前缀匹配承运商
      const prefix = cleaned.slice(0, 4);
      const carrier = findCarrierByContainerPrefix(prefix);
      if (carrier) {
        const result = findCarrierInData(carrier);
        if (result) {
          carrierName = result.carrierName;
          carrierCode = result.carrierCode;
          // 对于船公司，构造带跟踪号的 URL（如果有 {0} 占位符）
          if (result.trackUrl.includes('{0}')) {
            trackUrl = result.trackUrl.replace(/\{0\}/g, cleaned);
          } else {
            trackUrl = result.trackUrl;
          }
        }
      }
    } else if (type === 'express') {
      // 快递单号：尝试匹配所有快递公司的 URL 模板
      for (const express of carriersData.expresses) {
        if (express.cnUrl && express.cnUrl.includes('{0}')) {
          trackUrl = express.cnUrl.replace(/\{0\}/g, cleaned);
          carrierName = express.cnName;
          carrierCode = express.code;
          break;
        }
      }
      // 如果没有找到，使用 DHL 作为默认
      if (!trackUrl) {
        const dhl = carriersData.expresses.find(e => e.code === 'dhl');
        if (dhl?.cnUrl) {
          trackUrl = dhl.cnUrl.replace(/\{0\}/g, cleaned);
          carrierName = dhl.cnName;
          carrierCode = dhl.code;
        }
      }
    } else if (type === 'bl') {
      // 提单号：尝试匹配格式
      for (const bp of BL_PATTERNS) {
        if (bp.pattern.test(cleaned) && bp.carrier && bp.carrier !== '__container__') {
          const result = findCarrierInData(bp.carrier);
          if (result) {
            carrierName = result.carrierName;
            carrierCode = result.carrierCode;
            trackUrl = result.trackUrl.includes('{0}')
              ? result.trackUrl.replace(/\{0\}/g, cleaned)
              : result.trackUrl;
            break;
          }
        }
      }
    }

    // 如果仍未匹配成功，尝试用维运网承运商数据做模糊匹配
    if (!trackUrl) {
      // 尝试在所有数据中搜索可能的承运商
      for (const sl of carriersData.shipLines) {
        if (sl.cnWebsite && sl.cnWebsite.includes('{0}')) {
          trackUrl = sl.cnWebsite.replace(/\{0\}/g, cleaned);
          carrierName = sl.cnName;
          carrierCode = sl.code;
          break;
        }
      }
    }

    // 最终兜底：构造维运网货物跟踪页面 URL
    if (!trackUrl) {
      trackUrl = `https://www.weiyun001.com/track`;
      carrierName = '维运网';
      carrierCode = 'weiyun';
    }

    return NextResponse.json({
      success: true,
      data: {
        trackingNo: cleaned,
        type,
        trackUrl,
        carrierName,
        carrierCode,
        source: 'weiyun001.com',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}