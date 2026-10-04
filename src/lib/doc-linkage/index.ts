/**
 * 跨单证联动模块（Doc Linkage）
 *
 * 负责：
 * 1. 定义各单证之间的引用关系（谁引用谁）
 * 2. 提供从 DocRef 解析导航 URL 的能力
 * 3. 提供从单证编号反查源单证的能力
 *
 * 使用示例：
 *   const url = resolveDocUrl({ docType: 'contract', docId: 'xxx', docNo: 'TD-2025-001' });
 *   // → '/contract-documents?search=TD-2025-001'
 */

import type { DocRef, DocType } from '@/lib/domain';

// ---- 导航 URL 解析 ----

/**
 * 根据 DocType 和 docNo 生成导航 URL
 * 用于在单证 A 中点击跳转到单证 B
 */
export function resolveDocUrl(docRef: DocRef): string {
  const { docType, docNo } = docRef;
  const encodedNo = encodeURIComponent(docNo);

  switch (docType) {
    case 'contract':
    case 'invoice':
    case 'packing-list':
      return `/contract-documents?search=${encodedNo}`;
    case 'export-license':
    case 'export-license-draft':
      return `/export-license?search=${encodedNo}`;
    case 'customs-declaration':
      return `/customs-declaration?search=${encodedNo}`;
    case 'vehicle-archive':
      return `/vehicle-check?search=${encodedNo}`;
    case 'proforma-invoice':
      return `/my-records?search=${encodedNo}`;
    case 'compliance-declaration':
      return `/my-records?search=${encodedNo}`;
    case 'procurement':
      return `/procurement?search=${encodedNo}`;
    default:
      return '#';
  }
}

/**
 * 根据 DocType 和 docNo 生成编辑 URL
 * 用于跳转到单证的编辑页
 */
export function resolveDocEditUrl(docRef: DocRef): string {
  const { docType, docId } = docRef;

  switch (docType) {
    case 'contract':
    case 'invoice':
    case 'packing-list':
      // 跳转到 documents/new 加载草稿
      return `/documents/new?draft=${docId}`;
    case 'export-license-draft':
      return `/export-license/draft?id=${docId}`;
    case 'customs-declaration':
      return `/customs-declaration/${docId}`;
    case 'procurement':
      return `/procurement/${docId}`;
    default:
      return '#';
  }
}

// ---- 单证间引用关系 ----

/** 引用关系：source 引用 target */
export interface DocLinkage {
  /** 引用方单证类型 */
  source: DocType;
  /** 被引用方单证类型 */
  target: DocType;
  /** 引用字段名（在 source 中的字段名） */
  fieldName: string;
  /** 引用说明 */
  description: string;
}

/** 所有预定义的跨单证引用关系 */
export const DOC_LINKAGES: DocLinkage[] = [
  {
    source: 'customs-declaration',
    target: 'contract',
    fieldName: 'contractNo',
    description: '报关单引用合同号',
  },
  {
    source: 'customs-declaration',
    target: 'export-license',
    fieldName: 'licenseNo',
    description: '报关单引用许可证号',
  },
  {
    source: 'customs-declaration',
    target: 'packing-list',
    fieldName: 'blNo',
    description: '报关单引用提单号（来自装箱单）',
  },
  {
    source: 'export-license',
    target: 'contract',
    fieldName: 'contractNo',
    description: '许可证引用合同号',
  },
  {
    source: 'export-license',
    target: 'vehicle-archive',
    fieldName: 'vin',
    description: '许可证附加表引用车辆档案 VIN',
  },
  {
    source: 'contract',
    target: 'vehicle-archive',
    fieldName: 'vin',
    description: '合同车辆清单引用车辆档案 VIN',
  },
  {
    source: 'packing-list',
    target: 'contract',
    fieldName: 'contractNo',
    description: '装箱单引用合同号',
  },
];

/**
 * 获取某个单证类型的被引用方列表
 */
export function getTargets(sourceType: DocType): DocLinkage[] {
  return DOC_LINKAGES.filter((l) => l.source === sourceType);
}

/**
 * 获取引用某个单证类型的引用方列表
 */
export function getSources(targetType: DocType): DocLinkage[] {
  return DOC_LINKAGES.filter((l) => l.target === targetType);
}