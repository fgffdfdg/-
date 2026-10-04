/**
 * 形式发票 - 类型定义、默认值与序列化辅助
 *
 * 清单条目支持两种输入方式：
 *  1. vehicle —— 车辆（与车型档案强绑定，VIN 可检索带出信息），含备注栏
 *  2. product —— 任意产品（自由输入品名/规格等维度，不需要 VIN 等车辆信息）
 *
 * 发票编号（invoice_no）由系统按时间自动生成，不再让用户手填。
 * 合同号 / 合同日期字段已移除（对形式发票无价值）。
 */

/** 条目类型：车辆 / 产品 */
export type ItemType = "vehicle" | "product";

/** 形式发票清单条目（车辆与产品共用一个结构，按 item_type 区分展示与字段） */
export interface InvoiceItem {
  item_type: ItemType;
  // ── 通用字段 ──
  qty: number;
  price: string;
  remarks: string;
  // ── 车辆专属 ──
  brand: string;
  model: string;
  vin: string;
  condition: string;
  energy: string;
  power: string;
  body: string;
  net: string;
  gross: string;
  // ── 产品专属 ──
  name: string;
  description: string;
  unit: string;
}

/** 形式发票表单数据 */
export interface InvoiceData {
  id?: string;
  invoice_no: string;
  invoice_date: string;
  // 卖方
  seller_name: string;
  seller_name_en: string;
  seller_address: string;
  seller_address_en: string;
  seller_phone: string;
  seller_fax: string;
  seller_email: string;
  // 买方
  buyer_name: string;
  buyer_name_en: string;
  buyer_address: string;
  buyer_address_en: string;
  buyer_phone: string;
  buyer_fax: string;
  buyer_email: string;
  // 收货人
  consignee_name: string;
  consignee_name_en: string;
  consignee_address: string;
  consignee_address_en: string;
  consignee_phone: string;
  consignee_email: string;
  // 运输
  port_of_loading: string;
  port_of_loading_en: string;
  port_of_discharge: string;
  port_of_discharge_en: string;
  transport_mode: string;
  shipment_date: string;
  partial_shipment: boolean;
  transshipment: boolean;
  // 付款
  payment_terms: string;
  incoterm: string;
  currency: string;
  // 收款信息（整段文本：银行名/账号/SWIFT/收款人等，支持一次性粘贴，不拆分板块）
  payment_info: string;
  // 清单（车辆 + 产品混合）
  items: InvoiceItem[];
  // 备注
  remarks: string;
  remarks_en: string;
}

// ─── 默认值 ────────────────────────────────────────────────────

export const defaultVehicleItem: InvoiceItem = {
  item_type: "vehicle",
  qty: 1,
  price: "",
  remarks: "",
  brand: "",
  model: "",
  vin: "",
  condition: "Used",
  energy: "Battery Electric",
  power: "",
  body: "Passenger Vehicle",
  net: "",
  gross: "",
  name: "",
  description: "",
  unit: "",
};

export const defaultProductItem: InvoiceItem = {
  item_type: "product",
  qty: 1,
  price: "",
  remarks: "",
  brand: "",
  model: "",
  vin: "",
  condition: "",
  energy: "",
  power: "",
  body: "",
  net: "",
  gross: "",
  name: "",
  description: "",
  unit: "PCS",
};

export function createVehicleItem(): InvoiceItem {
  return { ...defaultVehicleItem };
}

export function createProductItem(): InvoiceItem {
  return { ...defaultProductItem };
}

export function createDefaultInvoice(): InvoiceData {
  return {
    invoice_no: "",
    invoice_date: "",
    seller_name: "",
    seller_name_en: "",
    seller_address: "",
    seller_address_en: "",
    seller_phone: "",
    seller_fax: "",
    seller_email: "",
    buyer_name: "",
    buyer_name_en: "",
    buyer_address: "",
    buyer_address_en: "",
    buyer_phone: "",
    buyer_fax: "",
    buyer_email: "",
    consignee_name: "",
    consignee_name_en: "",
    consignee_address: "",
    consignee_address_en: "",
    consignee_phone: "",
    consignee_email: "",
    port_of_loading: "",
    port_of_loading_en: "",
    port_of_discharge: "",
    port_of_discharge_en: "",
    transport_mode: "Ro-Ro",
    shipment_date: "",
    partial_shipment: false,
    transshipment: false,
    payment_terms: "T/T",
    incoterm: "CIF",
    currency: "USD",
    payment_info: "",
    items: [createVehicleItem()],
    remarks: "",
    remarks_en: "",
  };
}

// ─── 发票编号自动生成（基于时间）──────────────────────────────

/** 生成日期字符串 YYYY-MM-DD（本地时区） */
export function todayStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 按当前时间自动生成发票编号，格式：PI-YYYYMMDD-HHmmss
 * 例如：PI-20250615-143052。精确到秒，保证同一秒内不重复即可满足业务需求。
 */
export function generateInvoiceNo(date: Date = new Date()): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `PI-${y}${mo}${d}-${h}${mi}${s}`;
}

// ─── 序列化：表单 → API 载荷 ──────────────────────────────────

/**
 * 将表单数据转换为 API 载荷。
 * 注意：卖方信息存放在 buyer_info 中（与既有数据结构保持兼容）。
 */
export function invoiceDataToApiPayload(data: InvoiceData) {
  return {
    title: data.invoice_no || "未命名发票",
    buyer_info: {
      buyer_name: data.buyer_name,
      buyer_name_en: data.buyer_name_en,
      buyer_address: data.buyer_address,
      buyer_address_en: data.buyer_address_en,
      buyer_phone: data.buyer_phone,
      buyer_fax: data.buyer_fax,
      buyer_email: data.buyer_email,
      consignee_name: data.consignee_name,
      consignee_name_en: data.consignee_name_en,
      consignee_address: data.consignee_address,
      consignee_address_en: data.consignee_address_en,
      consignee_phone: data.consignee_phone,
      consignee_email: data.consignee_email,
      seller_name: data.seller_name,
      seller_name_en: data.seller_name_en,
      seller_address: data.seller_address,
      seller_address_en: data.seller_address_en,
      seller_phone: data.seller_phone,
      seller_fax: data.seller_fax,
      seller_email: data.seller_email,
    },
    order_info: {
      invoice_no: data.invoice_no,
      invoice_date: data.invoice_date,
      port_of_loading: data.port_of_loading,
      port_of_loading_en: data.port_of_loading_en,
      port_of_discharge: data.port_of_discharge,
      port_of_discharge_en: data.port_of_discharge_en,
      transport_mode: data.transport_mode,
      shipment_date: data.shipment_date,
      partial_shipment: data.partial_shipment,
      transshipment: data.transshipment,
      payment_terms: data.payment_terms,
      incoterm: data.incoterm,
      currency: data.currency,
      payment_info: data.payment_info,
      remarks: data.remarks,
      remarks_en: data.remarks_en,
    },
    vehicles: data.items,
  };
}

// ─── 反序列化：API 记录 → 表单 ────────────────────────────────

/** 将后端返回的原始条目（可能是旧版车辆结构或新版双模结构）规范化为 InvoiceItem */
function normalizeItem(raw: Record<string, unknown>): InvoiceItem {
  const type: ItemType = raw.item_type === "product" ? "product" : "vehicle";
  const base = type === "product" ? { ...defaultProductItem } : { ...defaultVehicleItem };
  const merged = { ...base, ...raw, item_type: type } as InvoiceItem;
  // qty 容错
  const q = Number(raw.qty);
  merged.qty = Number.isFinite(q) && q > 0 ? q : 1;
  // 字符串字段容错
  merged.price = typeof raw.price === "string" ? raw.price : raw.price == null ? "" : String(raw.price);
  merged.remarks = typeof raw.remarks === "string" ? raw.remarks : "";
  return merged;
}

/** 将后端返回的发票记录还原为表单数据（合同号/合同日期字段已废弃，读取时忽略） */
export function apiRecordToInvoiceData(record: Record<string, unknown>): InvoiceData {
  const buyerInfo = (record.buyer_info ?? {}) as Record<string, string>;
  const orderInfo = (record.order_info ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(record.vehicles) ? (record.vehicles as Record<string, unknown>[]) : [];
  const items = rawItems.length > 0 ? rawItems.map(normalizeItem) : [createVehicleItem()];

  return {
    id: record.id as string,
    invoice_no: (orderInfo.invoice_no as string) ?? (record.title as string) ?? "",
    invoice_date: (orderInfo.invoice_date as string) ?? "",
    seller_name: buyerInfo.seller_name ?? "",
    seller_name_en: buyerInfo.seller_name_en ?? "",
    seller_address: buyerInfo.seller_address ?? "",
    seller_address_en: buyerInfo.seller_address_en ?? "",
    seller_phone: buyerInfo.seller_phone ?? "",
    seller_fax: buyerInfo.seller_fax ?? "",
    seller_email: buyerInfo.seller_email ?? "",
    buyer_name: buyerInfo.buyer_name ?? "",
    buyer_name_en: buyerInfo.buyer_name_en ?? "",
    buyer_address: buyerInfo.buyer_address ?? "",
    buyer_address_en: buyerInfo.buyer_address_en ?? "",
    buyer_phone: buyerInfo.buyer_phone ?? "",
    buyer_fax: buyerInfo.buyer_fax ?? "",
    buyer_email: buyerInfo.buyer_email ?? "",
    consignee_name: buyerInfo.consignee_name ?? "",
    consignee_name_en: buyerInfo.consignee_name_en ?? "",
    consignee_address: buyerInfo.consignee_address ?? "",
    consignee_address_en: buyerInfo.consignee_address_en ?? "",
    consignee_phone: buyerInfo.consignee_phone ?? "",
    consignee_email: buyerInfo.consignee_email ?? "",
    port_of_loading: (orderInfo.port_of_loading as string) ?? "",
    port_of_loading_en: (orderInfo.port_of_loading_en as string) ?? "",
    port_of_discharge: (orderInfo.port_of_discharge as string) ?? "",
    port_of_discharge_en: (orderInfo.port_of_discharge_en as string) ?? "",
    transport_mode: (orderInfo.transport_mode as string) ?? "Ro-Ro",
    shipment_date: (orderInfo.shipment_date as string) ?? "",
    partial_shipment: (orderInfo.partial_shipment as boolean) ?? false,
    transshipment: (orderInfo.transshipment as boolean) ?? false,
    payment_terms: (orderInfo.payment_terms as string) ?? "T/T",
    incoterm: (orderInfo.incoterm as string) ?? "CIF",
    currency: (orderInfo.currency as string) ?? "USD",
    payment_info: (orderInfo.payment_info as string) ?? "",
    items,
    remarks: (orderInfo.remarks as string) ?? "",
    remarks_en: (orderInfo.remarks_en as string) ?? "",
  };
}

// ─── 展示辅助 ─────────────────────────────────────────────────

/** 预览/打印时的条目标题描述 */
export function itemTitle(item: InvoiceItem): string {
  if (item.item_type === "product") {
    return [item.name, item.description].filter(Boolean).join(" · ");
  }
  return [item.brand, item.model].filter(Boolean).join(" ");
}

/** 计算总金额（车辆与产品条目统一按 单价 × 数量） */
export function calculateItemsTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, it) => {
    const price = parseFloat(it.price) || 0;
    const qty = it.qty || 1;
    return sum + price * qty;
  }, 0);
}
