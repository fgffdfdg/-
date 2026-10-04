/**
 * 领域模型 - 跨单证引用（DocRef）
 *
 * 替代旧系统中裸字符串的跨单证引用。
 *
 * 旧方式：
 *   contractNo: string  ← 不知道这个合同号来自哪里、是否还有效
 *
 * 新方式：
 *   contractRef?: DocRef  ← 可点击跳转到源单证
 *   contractNo: string    ← 保留冗余字段，预览/打印时无需额外查询
 */

/** 单证类型标识 */
export type DocType =
  | 'vehicle-archive'       // 车型档案
  | 'contract'              // 出口合同
  | 'invoice'               // 商业发票
  | 'packing-list'          // 装箱单
  | 'export-license'        // 出口许可证
  | 'export-license-draft'  // 许可证草单
  | 'customs-declaration'   // 出口报关单预录单
  | 'proforma-invoice'      // 形式发票
  | 'compliance-declaration'// 准入声明
  | 'procurement';          // 车辆采购合同

/** 单证类型的中文名 */
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  'vehicle-archive': '车型档案',
  'contract': '出口合同',
  'invoice': '商业发票',
  'packing-list': '装箱单',
  'export-license': '出口许可证',
  'export-license-draft': '许可证草单',
  'customs-declaration': '出口报关单',
  'proforma-invoice': '形式发票',
  'compliance-declaration': '准入声明',
  'procurement': '车辆采购合同',
};

/**
 * 跨单证引用
 *
 * 当单证 A 需要引用单证 B 时，使用此类型。
 * 同时保留冗余字段（如 contractNo）用于预览/打印。
 */
export interface DocRef {
  /** 引用的单证类型 */
  docType: DocType;
  /** 引用的单证 ID（数据库 ID） */
  docId: string;
  /** 人类可读编号（如 TD-2025-001、ED20250715001） */
  docNo: string;
  /** 可选：单证名称/标题 */
  docTitle?: string;
}

/** 创建 DocRef 的工厂函数 */
export function createDocRef(
  docType: DocType,
  docId: string,
  docNo: string,
  docTitle?: string,
): DocRef {
  return { docType, docId, docNo, docTitle };
}

/** 判断两个 DocRef 是否指向同一单证 */
export function isSameDocRef(a: DocRef | null | undefined, b: DocRef | null | undefined): boolean {
  if (!a || !b) return false;
  return a.docType === b.docType && a.docId === b.docId;
}

/** 从 DocRef 生成用于显示的文本 */
export function docRefDisplay(docRef: DocRef | null | undefined): string {
  if (!docRef) return '';
  if (docRef.docTitle) {
    return `${DOC_TYPE_LABELS[docRef.docType] || docRef.docType}：${docRef.docNo}（${docRef.docTitle}）`;
  }
  return `${DOC_TYPE_LABELS[docRef.docType] || docRef.docType}：${docRef.docNo}`;
}