import { NextRequest, NextResponse } from "next/server";

// ─── Types ───

interface FieldSource {
  value: string | number | null;
  source: "jsonld" | "opengraph" | "meta" | "structured-json" | "platform-adapter" | "text-extraction" | "url-derived";
  confidence: number; // 0-1
}

interface ParsedVehicle {
  platform: string;
  sourceUrl: string;
  sourceListingId: string | null;
  brand: FieldSource;
  series: FieldSource;
  model: FieldSource;
  year: FieldSource;
  mileageKm: FieldSource;
  priceAmount: FieldSource;
  currency: FieldSource;
  location: FieldSource;
  vin: FieldSource;
  images: { value: string[]; source: string; confidence: number };
  seller: FieldSource;
  publishedAt: FieldSource;
  rawTitle: string;
}

interface ParseResult {
  success: boolean;
  status: "complete" | "partial" | "failed" | "blocked" | "needs_manual";
  statusReason: string;
  platform: string;
  domain: string;
  url: string;
  completeness: number;
  missingFields: string[];
  data: Record<string, unknown>;
  fields: ParsedVehicle | null;
  parserVersion: string;
  parsedAt: string;
}

// ─── Constants ───

const PARSER_VERSION = "2.0.0";

const PLATFORM_MAP: Record<string, string> = {
  "autohome.com.cn": "汽车之家",
  "www.autohome.com.cn": "汽车之家",
  "cheshi.com": "网上车市",
  "www.cheshi.com": "网上车市",
  "dongchedi.com": "懂车帝",
  "www.dongchedi.com": "懂车帝",
  "guazi.com": "瓜子二手车",
  "www.guazi.com": "瓜子二手车",
  "58.com": "58同城",
  "www.58.com": "58同城",
  "xin.com": "优信二手车",
  "www.xin.com": "优信二手车",
  "2sc.autohome.com.cn": "汽车之家二手车",
  "che168.com": "二手车之家",
  "www.che168.com": "二手车之家",
};

// 禁止访问的地址模式
const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "10.", "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
  "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
  "172.30.", "172.31.", "192.168.",
  "169.254.", "metadata.google.internal", "metadata.",
];

const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2MB
const FETCH_TIMEOUT_MS = 12000;

// ─── Helpers ───

function buildResult(status: ParseResult["status"], reason: string, overrides: Partial<ParseResult> = {}): ParseResult {
  const base: ParseResult = {
    success: status === "complete" || status === "partial",
    status,
    statusReason: reason,
    platform: "未知平台",
    domain: "",
    url: "",
    completeness: 0,
    missingFields: [],
    data: {},
    fields: null,
    parserVersion: PARSER_VERSION,
    parsedAt: new Date().toISOString(),
    ...overrides,
  };
  return base;
}

function fieldSrc(value: unknown, source: FieldSource["source"], confidence: number): FieldSource {
  return {
    value: value != null && value !== "" ? (typeof value === "number" ? value : String(value)) : null,
    source,
    confidence,
  };
}

function computeCompleteness(fields: ParsedVehicle): { score: number; missing: string[] } {
  const keys: { key: keyof ParsedVehicle; label: string }[] = [
    { key: "brand", label: "品牌" },
    { key: "series", label: "车系" },
    { key: "model", label: "款型" },
    { key: "year", label: "年份" },
    { key: "mileageKm", label: "里程" },
    { key: "priceAmount", label: "价格" },
    { key: "location", label: "所在地" },
    { key: "vin", label: "VIN" },
    { key: "sourceListingId", label: "车源编号" },
  ];
  let filled = 0;
  const missing: string[] = [];
  for (const { key, label } of keys) {
    const f = fields[key];
    if (f && typeof f === "object" && "value" in f && (f as FieldSource).value != null) {
      filled++;
    } else if (f && typeof f === "string" && f.length > 0) {
      filled++;
    } else {
      missing.push(label);
    }
  }
  return { score: keys.length > 0 ? filled / keys.length : 0, missing };
}

function flattenFields(fields: ParsedVehicle): Record<string, unknown> {
  return {
    brand: fields.brand.value,
    series: fields.series.value,
    model: fields.model.value,
    year: fields.year.value,
    mileageKm: fields.mileageKm.value,
    priceAmount: fields.priceAmount.value,
    currency: fields.currency.value,
    location: fields.location.value,
    vin: fields.vin.value,
    images: fields.images.value,
    seller: fields.seller.value,
    publishedAt: fields.publishedAt.value,
    sourceListingId: fields.sourceListingId,
    sourceUrl: fields.sourceUrl,
    platform: fields.platform,
    rawTitle: fields.rawTitle,
  };
}

// ─── SSRF Protection ───

function validateUrl(raw: string): { valid: boolean; error?: string; url?: URL } {
  if (!raw || !raw.trim()) return { valid: false, error: "URL 不能为空" };
  const trimmed = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "无效的 URL 格式" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "仅支持 http/https 协议" };
  }

  const hostname = parsed.hostname.toLowerCase();
  for (const blocked of BLOCKED_HOSTS) {
    if (hostname === blocked || hostname.startsWith(blocked)) {
      return { valid: false, error: "不允许访问该地址" };
    }
  }

  // 检查是否是 IP 地址 (IPv4)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split(".").map(Number);
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] >= 224 ||
      (parts[0] === 169 && parts[1] === 254)
    ) {
      return { valid: false, error: "不允许访问内网地址" };
    }
  }

  return { valid: true, url: parsed };
}

// ─── Fetch ───

async function fetchPage(url: string): Promise<{ html: string; status: "ok" | "timeout" | "blocked" | "error"; reason?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ExportDrive/1.0; +https://exportdrive.com)",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      redirect: "follow",
    });

    if (res.status === 403 || res.status === 429) {
      return { html: "", status: "blocked", reason: `网站阻止访问 (HTTP ${res.status})` };
    }

    if (res.status === 404) {
      return { html: "", status: "error", reason: "页面不存在 (404)" };
    }

    if (res.status >= 500) {
      return { html: "", status: "error", reason: `服务器错误 (HTTP ${res.status})` };
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return { html: "", status: "error", reason: "响应内容过大" };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
      return { html: "", status: "error", reason: `不支持的内容类型: ${contentType}` };
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      return { html: text.slice(0, MAX_RESPONSE_SIZE), status: "ok" };
    }

    return { html: text, status: "ok" };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { html: "", status: "timeout", reason: "请求超时" };
    }
    return { html: "", status: "error", reason: `网络错误: ${(err as Error).message}` };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Platform Detection ───

function detectPlatform(domain: string): string {
  return PLATFORM_MAP[domain] || domain;
}

function extractListingId(url: string, domain: string): string | null {
  // 瓜子: /car-detail/c169421982156471.html
  if (domain.includes("guazi.com")) {
    const m = url.match(/\/car-detail\/([a-z]?\d+)\.html/);
    if (m) return m[1];
  }
  // 汽车之家/二手车之家: /car/detail/xxx
  if (domain.includes("autohome.com.cn") || domain.includes("che168.com")) {
    const m = url.match(/\/detail\/(\d+)/);
    if (m) return m[1];
  }
  // 懂车帝: /car/detail/xxx
  if (domain.includes("dongchedi.com")) {
    const m = url.match(/\/detail\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

// ─── Extractors ───

function extractJSONLD(html: string): Record<string, unknown> | null {
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let best: Record<string, unknown> | null = null;
  let match;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "Car" || data["@type"] === "Vehicle" || (data["@graph"] && Array.isArray(data["@graph"]))) {
        return data;
      }
      if (!best) best = data;
    } catch { /* skip */ }
  }
  return best;
}

function mapJSONLDToFields(ld: Record<string, unknown>): Partial<ParsedVehicle> {
  const fields: Partial<ParsedVehicle> = {};

  const graph = ld["@graph"]
    ? (Array.isArray(ld["@graph"]) ? ld["@graph"] : [ld["@graph"]])
    : [ld];

  for (const item of graph) {
    const t = item as Record<string, unknown>;
    if (t.name) fields.brand = fieldSrc(String(t.name).split(" ")[0], "jsonld", 0.6);

    if (t.brand && typeof t.brand === "object") {
      fields.brand = fieldSrc((t.brand as Record<string, unknown>).name as string, "jsonld", 0.8);
    }
    if (t.model) fields.series = fieldSrc(t.model as string, "jsonld", 0.6);
    if (t.vehicleModelDate) fields.year = fieldSrc(String(t.vehicleModelDate).slice(0, 4), "jsonld", 0.8);
    if (t.mileageFromOdometer) {
      const m = t.mileageFromOdometer as Record<string, unknown>;
      fields.mileageKm = fieldSrc(m.value as number, "jsonld", 0.8);
    }
    if (t.offers && typeof t.offers === "object") {
      const offer = t.offers as Record<string, unknown>;
      fields.priceAmount = fieldSrc(offer.price as number, "jsonld", 0.8);
      if (offer.priceCurrency) fields.currency = fieldSrc(offer.priceCurrency as string, "jsonld", 0.9);
    }
    if (t.vehicleIdentificationNumber) fields.vin = fieldSrc(t.vehicleIdentificationNumber as string, "jsonld", 0.9);
    if (t.image) {
      if (typeof t.image === "string") fields.images = { value: [t.image], source: "jsonld", confidence: 0.8 };
      else if (Array.isArray(t.image)) fields.images = { value: t.image.map((i: unknown) => typeof i === "string" ? i : String((i as Record<string, unknown>).url || "")).filter(Boolean) as string[], source: "jsonld", confidence: 0.8 };
    }
  }
  return fields;
}

function extractOpenGraph(html: string): Record<string, string> {
  const og: Record<string, string> = {};
  const metaRegex = /<meta[^>]+(?:property|name)=["'](og:[^"']+)["'][^>]+content=["']([^"']*)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    og[match[1].replace("og:", "")] = match[2];
  }
  return og;
}

function extractPriceMeta(html: string): Record<string, string> {
  const pm: Record<string, string> = {};
  // Match meta tags like: og:price:amount, product:price:amount, price:amount, etc.
  const metaRegex = /<meta[^>]+(?:property|name)=["']((?:og:|product:)?price(?:[:](?:amount|currency))?)["'][^>]+content=["']([^"']*)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].replace(/^(?:og:|product:)?/, ""); // normalize to "price:amount", "price:currency"
    pm[key] = match[2];
  }
  return pm;
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const descRegex = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i;
  const descMatch = descRegex.exec(html);
  if (descMatch) meta.description = descMatch[1];

  const keywordsRegex = /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i;
  const kwMatch = keywordsRegex.exec(html);
  if (kwMatch) meta.keywords = kwMatch[1];

  return meta;
}

// ─── Platform Adapter: Guazi ───

function extractGuazi(html: string, url: string): Partial<ParsedVehicle> | null {
  const fields: Partial<ParsedVehicle> = {};

  // 尝试从 __NEXT_DATA__ 或内嵌 JSON 提取
  const nextDataRegex = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
  const nextDataMatch = nextDataRegex.exec(html);
  if (nextDataMatch) {
    try {
      const nd = JSON.parse(nextDataMatch[1]);
      const props = nd?.props?.pageProps;
      if (props) {
        const carInfo = props.carInfo || props.detailInfo || props.carData || props;
        if (carInfo) {
          if (carInfo.brand_name) fields.brand = fieldSrc(carInfo.brand_name, "platform-adapter", 0.85);
          if (carInfo.series_name) fields.series = fieldSrc(carInfo.series_name, "platform-adapter", 0.85);
          if (carInfo.model_name || carInfo.car_name) fields.model = fieldSrc(carInfo.model_name || carInfo.car_name, "platform-adapter", 0.8);
          if (carInfo.register_date || carInfo.license_date) {
            const d = carInfo.register_date || carInfo.license_date;
            fields.year = fieldSrc(String(d).slice(0, 4), "platform-adapter", 0.8);
          }
          if (carInfo.mileage) fields.mileageKm = fieldSrc(Number(carInfo.mileage), "platform-adapter", 0.85);
          if (carInfo.price || carInfo.selling_price) fields.priceAmount = fieldSrc(Number(carInfo.price || carInfo.selling_price), "platform-adapter", 0.85);
          if (carInfo.city_name || carInfo.city) fields.location = fieldSrc(carInfo.city_name || carInfo.city, "platform-adapter", 0.85);
          if (carInfo.vin) fields.vin = fieldSrc(carInfo.vin, "platform-adapter", 0.9);
          if (carInfo.images || carInfo.pics) {
            const imgs = Array.isArray(carInfo.images || carInfo.pics) ? (carInfo.images || carInfo.pics) : [];
            fields.images = { value: imgs.map((i: unknown) => typeof i === "string" ? i : (i as Record<string, unknown>).url || (i as Record<string, unknown>).src || "").filter(Boolean), source: "platform-adapter", confidence: 0.85 };
          }
          return fields;
        }
      }
    } catch { /* continue */ }
  }

  // 尝试 window.__INITIAL_STATE__ 或类似模式
  const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i;
  const stateMatch = stateRegex.exec(html);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const detail = state?.detail || state?.carDetail || state;
      if (detail) {
        if (detail.brandName || detail.brand_name) fields.brand = fieldSrc(detail.brandName || detail.brand_name, "platform-adapter", 0.85);
        if (detail.seriesName || detail.series_name) fields.series = fieldSrc(detail.seriesName || detail.series_name, "platform-adapter", 0.85);
        if (detail.modelName || detail.model_name || detail.title) fields.model = fieldSrc(detail.modelName || detail.model_name || detail.title, "platform-adapter", 0.8);
        if (detail.registerDate || detail.licenseDate) {
          fields.year = fieldSrc(String(detail.registerDate || detail.licenseDate).slice(0, 4), "platform-adapter", 0.8);
        }
        if (detail.mileage) fields.mileageKm = fieldSrc(Number(detail.mileage), "platform-adapter", 0.85);
        if (detail.price || detail.sellingPrice) fields.priceAmount = fieldSrc(Number(detail.price || detail.sellingPrice), "platform-adapter", 0.85);
        if (detail.cityName || detail.city) fields.location = fieldSrc(detail.cityName || detail.city, "platform-adapter", 0.85);
        if (detail.vin) fields.vin = fieldSrc(detail.vin, "platform-adapter", 0.9);
        return fields;
      }
    } catch { /* continue */ }
  }

  // 尝试从页面文本提取
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].trim() : "";

  // 瓜子标题格式: 【二手林肯 领航员 2016款 3.5T AWD】报价_图片_...
  // 或: 林肯 领航员 2016款 3.5T AWD - 瓜子二手车
  if (rawTitle) {
    // 清理标题：去掉【】、平台后缀、报价_图片等
    let cleanTitle = rawTitle
      .replace(/【[^】]*】/g, " ")
      .replace(/报价[_\s]*图片[_\s]*/g, " ")
      .replace(/二手车/g, " ")
      .replace(/-?\s*瓜子二手车.*$/, "")
      .replace(/报价[，,].*$/, "")
      .replace(/\s+/g, " ")
      .trim();

    // 去掉"二手"前缀
    cleanTitle = cleanTitle.replace(/^二手\s*/, "");

    // 尝试解析: 品牌 车系 年份款 型号
    // 模式: "林肯 领航员 2016款 3.5T AWD"
    const yearModelMatch = cleanTitle.match(/^(.+?)\s+(\d{4})\s*款\s*(.+)$/);
    if (yearModelMatch) {
      const brandSeries = yearModelMatch[1].trim();
      const year = yearModelMatch[2];
      const model = `${year}款 ${yearModelMatch[3].trim()}`;

      // 品牌: 第一个词
      const brandSeriesParts = brandSeries.split(/\s+/);
      if (brandSeriesParts.length >= 1) {
        fields.brand = fieldSrc(brandSeriesParts[0], "text-extraction", 0.75);
      }
      if (brandSeriesParts.length >= 2) {
        fields.series = fieldSrc(brandSeriesParts.slice(1).join(" "), "text-extraction", 0.7);
      }
      fields.year = fieldSrc(Number(year), "text-extraction", 0.8);
      fields.model = fieldSrc(model, "text-extraction", 0.75);
    } else {
      // 简单模式: 品牌 车系
      const parts = cleanTitle.split(/\s+/);
      if (parts.length >= 1) fields.brand = fieldSrc(parts[0], "text-extraction", 0.5);
      if (parts.length >= 2) fields.series = fieldSrc(parts.slice(1).join(" "), "text-extraction", 0.5);
    }
  }

  // 从 meta 标签提取价格（product:price:amount）
  const metaPriceRegex = /<meta[^>]+(?:property|name)=["'](?:product:)?price:amount["'][^>]+content=["'](\d+\.?\d*)["']/i;
  const metaPriceMatch = metaPriceRegex.exec(html);
  if (metaPriceMatch) {
    const priceYuan = parseFloat(metaPriceMatch[1]);
    if (priceYuan > 5000 && priceYuan < 5000000) {
      fields.priceAmount = fieldSrc(priceYuan, "meta", 0.85);
    }
  }

  // 价格: 匹配 "XX.XX万元" 或 "XX万" 模式
  // 在 title 中可能有 "售价XX.XX万"
  const pricePatterns = [
    /售价[：:\s]*(\d+\.?\d*)\s*万(?!公里)/g,
    /价格[：:\s]*(\d+\.?\d*)\s*万(?!公里)/g,
    /(\d+\.?\d{2})\s*万元?(?!公里)/g,
  ];
  for (const pattern of pricePatterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      const price = parseFloat(m[1]);
      // 合理的车价范围: 0.5万-500万
      if (price > 0.5 && price < 500) {
        fields.priceAmount = fieldSrc(price * 10000, "text-extraction", 0.55);
        break;
      }
    }
    if (fields.priceAmount && fields.priceAmount.value) break;
  }

  // 如果价格和里程相同，价格可能是错的，尝试从 meta description 中重新提取
  if (fields.priceAmount && fields.mileageKm && fields.priceAmount.value === fields.mileageKm.value) {
    // 价格和里程数值相同，尝试从描述中查找独立的价格
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    if (descMatch) {
      const desc = descMatch[1];
      const descPriceMatch = desc.match(/(\d+\.?\d*)\s*万[元\s]/);
      if (descPriceMatch) {
        const p = parseFloat(descPriceMatch[1]);
        if (p > 0.5 && p < 500 && p * 10000 !== fields.mileageKm.value) {
          fields.priceAmount = fieldSrc(p * 10000, "text-extraction", 0.5);
        }
      }
    }
  }

  // 里程: 匹配 "XX.XX万公里" 或 "表显里程XX万公里"
  if (!fields.mileageKm?.value) {
    const mileagePatterns = [
      /表显里程[：:\s]*(\d+\.?\d*)\s*万公里/g,
      /(\d+\.?\d*)\s*万公里/g,
      /行驶[：:\s]*(\d+\.?\d*)\s*万公里/g,
    ];
    for (const pattern of mileagePatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null) {
        const mileage = parseFloat(m[1]);
        if (mileage > 0.01 && mileage < 200) {
          fields.mileageKm = fieldSrc(mileage * 10000, "text-extraction", 0.55);
          break;
        }
      }
      if (fields.mileageKm?.value) break;
    }
  }

  // 从 meta 标签提取地区
  if (!fields.location?.value) {
    const metaCityRegex = /<meta[^>]+(?:property|name)=["'](?:og:)?region["'][^>]+content=["']([^"']*)["']/i;
    const metaCityMatch = metaCityRegex.exec(html);
    if (metaCityMatch) {
      const cityName = metaCityMatch[1].trim();
      if (cityName.length >= 2 && cityName.length <= 6) {
        fields.location = fieldSrc(cityName, "meta", 0.7);
      }
    }
  }

  // 地区
  if (!fields.location?.value) {
    const cityPattern = /(?:所在地|上牌地|城市|地区)[：:\s]*([^\s<]{2,6})/g;
    const cm = cityPattern.exec(html);
    if (cm) {
      // 验证是否是城市名
      const cityRegex = /^(北京|上海|广州|深圳|杭州|成都|武汉|南京|重庆|天津|苏州|西安|长沙|郑州|东莞|青岛|沈阳|宁波|昆明|合肥|大连|厦门|福州|无锡|佛山|济南|哈尔滨|长春|温州|石家庄|泉州|南宁|贵阳|南昌|太原|烟台|嘉兴|金华|珠海|惠州|常州|徐州|南通|潍坊|淄博|绍兴|台州|大庆|兰州|呼和浩特|海口|银川|西宁|拉萨|乌鲁木齐)$/;
      if (cityRegex.test(cm[1])) {
        fields.location = fieldSrc(cm[1], "text-extraction", 0.55);
      }
    }
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

// ─── Platform Adapter: Autohome/Dongchedi (reserved) ───

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractAutohome(_html: string, _url: string): Partial<ParsedVehicle> | null {
  // 预留接口，后续实现
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractDongchedi(_html: string, _url: string): Partial<ParsedVehicle> | null {
  // 预留接口，后续实现
  return null;
}

// ─── Platform Adapter Registry ───

function getPlatformAdapter(domain: string): ((html: string, url: string) => Partial<ParsedVehicle> | null) | null {
  if (domain.includes("guazi.com")) return extractGuazi;
  if (domain.includes("autohome.com.cn") || domain.includes("che168.com")) return extractAutohome;
  if (domain.includes("dongchedi.com")) return extractDongchedi;
  return null;
}

// ─── Main Pipeline ───

function runPipeline(html: string, url: string, domain: string, platform: string, listingId: string | null): ParsedVehicle {
  const emptyFields = (): ParsedVehicle => ({
    platform,
    sourceUrl: url,
    sourceListingId: listingId,
    brand: fieldSrc(null, "url-derived", 0),
    series: fieldSrc(null, "url-derived", 0),
    model: fieldSrc(null, "url-derived", 0),
    year: fieldSrc(null, "url-derived", 0),
    mileageKm: fieldSrc(null, "url-derived", 0),
    priceAmount: fieldSrc(null, "url-derived", 0),
    currency: fieldSrc("CNY", "url-derived", 0.9),
    location: fieldSrc(null, "url-derived", 0),
    vin: fieldSrc(null, "url-derived", 0),
    images: { value: [], source: "url-derived", confidence: 0 },
    seller: fieldSrc(null, "url-derived", 0),
    publishedAt: fieldSrc(null, "url-derived", 0),
    rawTitle: "",
  });

  const fields = emptyFields();

  // 提取标题
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  fields.rawTitle = titleMatch ? titleMatch[1].trim() : "";

  // Stage 1: JSON-LD
  const ld = extractJSONLD(html);
  if (ld) {
    const ldFields = mapJSONLDToFields(ld);
    for (const key of Object.keys(ldFields) as (keyof ParsedVehicle)[]) {
      if (ldFields[key] && (ldFields[key] as FieldSource).value != null) {
        (fields as unknown as Record<string, unknown>)[key] = ldFields[key];
      }
    }
  }

  // Stage 2: OpenGraph
  const og = extractOpenGraph(html);
  if (og.title && !fields.brand.value) {
    // 尝试从标题解析品牌
    const titleParts = og.title.split(/[\s\-\|]/);
    if (titleParts.length > 0) {
      fields.brand = fieldSrc(titleParts[0].trim(), "opengraph", 0.4);
    }
  }
  if (og.description && !fields.series.value) {
    fields.series = fieldSrc(og.description.slice(0, 200), "opengraph", 0.2);
  }

  // Stage 2.5: Price Meta (og:price:amount, product:price:amount, etc.)
  const priceMeta = extractPriceMeta(html);
  if (priceMeta["price:amount"] && !fields.priceAmount.value) {
    const priceYuan = parseFloat(priceMeta["price:amount"]);
    if (priceYuan > 5000 && priceYuan < 5000000) {
      fields.priceAmount = fieldSrc(priceYuan, "meta", 0.85);
    }
  }
  if (priceMeta["price:currency"] && !fields.currency.value) {
    fields.currency = fieldSrc(priceMeta["price:currency"], "meta", 0.9);
  }

  // Stage 3: Platform Adapter
  const adapter = getPlatformAdapter(domain);
  if (adapter) {
    const paFields = adapter(html, url);
    if (paFields) {
      for (const key of Object.keys(paFields) as (keyof ParsedVehicle)[]) {
        const pf = paFields[key] as FieldSource;
        if (pf && pf.value != null) {
          const existing = fields[key] as FieldSource;
          // platform adapter wins over lower-confidence sources
          if (!existing || existing.value == null || existing.confidence < pf.confidence) {
            (fields as unknown as Record<string, unknown>)[key] = pf;
          }
        }
      }
    }
  }

  // Stage 4: Meta description text extraction
  const meta = extractMeta(html);
  if (meta.description && !fields.location.value) {
    // 尝试从描述中提取地区
    const cityMatch = meta.description.match(/(北京|上海|广州|深圳|杭州|成都|武汉|南京|重庆|天津|苏州|西安|长沙|郑州|东莞|青岛|沈阳|宁波|昆明|合肥|大连|厦门|福州|无锡|佛山|济南|哈尔滨|长春|温州|石家庄|泉州|南宁|贵阳|南昌|太原|烟台|嘉兴|金华|珠海|惠州|常州|徐州|南通|潍坊|淄博|绍兴|台州|大庆|兰州|呼和浩特|海口|银川|西宁|拉萨|乌鲁木齐)/);
    if (cityMatch) {
      fields.location = fieldSrc(cityMatch[0], "text-extraction", 0.5);
    }
  }

  return fields;
}

// ─── Route Handler ───

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ success: false, error: "url is required" }, { status: 400 });

    // 1. Validate URL
    const validation = validateUrl(url);
    if (!validation.valid || !validation.url) {
      return NextResponse.json(buildResult("failed", validation.error || "URL 校验失败", { url }), { status: 400 });
    }

    const parsedUrl = validation.url;
    const domain = parsedUrl.hostname;
    const platform = detectPlatform(domain);
    const listingId = extractListingId(url, domain);

    // 2. Fetch page
    const fetchResult = await fetchPage(parsedUrl.toString());
    if (fetchResult.status !== "ok") {
      const reason = fetchResult.reason || "获取网页失败";
      const status: ParseResult["status"] = fetchResult.status === "blocked" ? "blocked" : "failed";
      return NextResponse.json(
        buildResult(status, reason, { platform, domain, url, data: { platform, domain, url, sourceListingId: listingId } }),
        { status: 200 }
      );
    }

    // 3. Run parsing pipeline
    const fields = runPipeline(fetchResult.html, url, domain, platform, listingId);
    const { score, missing } = computeCompleteness(fields);

    // 4. Determine status
    let status: ParseResult["status"];
    let statusReason: string;
    if (score >= 0.7) {
      status = "complete";
      statusReason = "解析完成";
    } else if (score >= 0.3) {
      status = "partial";
      statusReason = `部分字段提取成功，缺少: ${missing.join("、")}`;
    } else if (platform !== "未知平台") {
      status = "partial";
      statusReason = `平台识别成功，但未提取到足够车辆信息。缺少: ${missing.join("、")}`;
    } else {
      status = "failed";
      statusReason = "无法提取车辆信息，请手动录入";
    }

    return NextResponse.json({
      success: true,
      data: {
        success: status !== "failed",
        status,
        statusReason,
        platform,
        domain,
        url,
        completeness: score,
        missingFields: missing,
        data: flattenFields(fields),
        fields,
        parserVersion: PARSER_VERSION,
        parsedAt: new Date().toISOString(),
      } as ParseResult,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}