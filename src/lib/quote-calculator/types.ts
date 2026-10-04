// ============================================================
// 报价计算器 - 可视化搭建数据模型
//
// 核心概念：计算器由一组"具名单元格"组成，按顺序排列在列表中。
//   - input   输入格：用户填写数值或文本（如 车价、目的国）
//   - formula 公式格：写公式引用其它格子（如 车价 * 3% + 海运费）
//   - note    说明格：纯文本备注
// 公式通过中文名称互相引用，引擎实时联动求值。
// ============================================================

export type CellKind = 'input' | 'formula' | 'note';

export const CELL_KIND_LABELS: Record<CellKind, string> = {
  input: '数字',
  formula: '公式',
  note: '备注',
};

/** 数字展示格式 */
export type NumberFormatType = 'number' | 'currency' | 'percent';

export interface CellFormat {
  type: NumberFormatType;
  /** 小数位数（0~4） */
  decimals: number;
}

export const FORMAT_LABELS: Record<NumberFormatType, string> = {
  number: '数字',
  currency: '货币 ¥',
  percent: '百分比 %',
};

/** 卡片强调色（对应 globals.css 中的品牌语义色） */
export type CellAccent = 'navy' | 'orange' | 'success' | null;

export const CELL_ACCENTS: { value: CellAccent; label: string }[] = [
  { value: null, label: '默认' },
  { value: 'navy', label: '深蓝' },
  { value: 'orange', label: '橙色' },
  { value: 'success', label: '绿色' },
];

/** 单元格（列表中的一张卡片，数组顺序即展示顺序） */
export interface CalcCell {
  id: string;
  /** 中文名称，全表唯一，是公式引用的唯一标识 */
  name: string;
  kind: CellKind;
  /** input：用户输入的原始内容；note：说明文本；formula：空 */
  value: string;
  /** formula：公式文本（引用其它格子名称）；其它类型为空 */
  formula: string;
  /** 数字展示格式 */
  format: CellFormat;
  /** 强调色 */
  accent: CellAccent;
}

/** 一份保存的可视化计算器 */
export interface VisualCalculator {
  id: string;
  title: string;
  description: string;
  cells: CalcCell[];
  createdAt: string;
  updatedAt: string;
  /** 云端记录 ID（与 Supabase quote_calculators.id 对应） */
  cloudId?: string;
  /** 删除时间（存在即表示位于回收站，未彻底删除） */
  deletedAt?: string;
}

/** 云端存储结构版本号（写入 items jsonb：{ v, cells }；旧数组格式视为 v1 已废弃） */
export const CALC_DATA_VERSION = 2;

export const DEFAULT_CELL_FORMAT: CellFormat = { type: 'number', decimals: 2 };

let cellSeq = 0;

/** 生成单元格 ID */
export function createCellId(): string {
  cellSeq += 1;
  return `cell_${Date.now().toString(36)}_${cellSeq}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 创建一个新单元格 */
export function createCell(kind: CellKind, name = ''): CalcCell {
  return {
    id: createCellId(),
    name,
    kind,
    value: '',
    formula: '',
    format: kind === 'note' ? { type: 'number', decimals: 0 } : { ...DEFAULT_CELL_FORMAT },
    accent: null,
  };
}

/** 创建一份新的可视化计算器（含示例模板） */
export function createNewCalculator(title: string, description = ''): VisualCalculator {
  const now = new Date().toISOString();
  return {
    id: `calc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    description,
    cells: createDefaultCells(),
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// 默认模板：二手车出口报价（演示输入格 / 公式格 / 说明格联动）
// ============================================================

export function createDefaultCells(): CalcCell[] {
  const mk = (
    partial: Omit<CalcCell, 'id' | 'value' | 'formula' | 'accent'> & {
      value?: string;
      formula?: string;
      accent?: CellAccent;
    },
  ): CalcCell => ({
    id: createCellId(),
    value: '',
    formula: '',
    accent: null,
    ...partial,
  });

  return [
    mk({
      name: '车辆采购价',
      kind: 'input',
      value: '100000',
      format: { type: 'currency', decimals: 0 },
      accent: 'navy',
    }),
    mk({
      name: '海运费',
      kind: 'input',
      value: '14000',
      format: { type: 'currency', decimals: 0 },
    }),
    mk({
      name: '出口操作费',
      kind: 'input',
      value: '3000',
      format: { type: 'currency', decimals: 0 },
    }),
    mk({
      name: '平台服务费',
      kind: 'formula',
      formula: 'IF(车辆采购价 > 200000, 8000, IF(车辆采购价 > 100000, 5000, 3000))',
      format: { type: 'currency', decimals: 0 },
    }),
    mk({
      name: '银行手续费',
      kind: 'formula',
      formula: 'ROUND(车辆采购价 * 0.5%)',
      format: { type: 'currency', decimals: 0 },
    }),
    mk({
      name: '总报价',
      kind: 'formula',
      formula: '车辆采购价 + 平台服务费 + 银行手续费 + 海运费 + 出口操作费',
      format: { type: 'currency', decimals: 0 },
      accent: 'orange',
    }),
    mk({
      name: '使用说明',
      kind: 'note',
      value: '左侧是纯计算器：数字格直接录入数字，公式格只显示计算结果；选中单元格后在右侧面板编写公式、改数字或写备注，内容自动识别。\n公式中输入 @ 引用其它单元格（自动联想名称，Tab / 回车插入），用卡片头 ↑↓ 或拖拽手柄调整顺序。',
      format: { type: 'number', decimals: 0 },
    }),
  ];
}

// ============================================================
// 值格式化
// ============================================================

import type { CellValue } from './engine';

/**
 * 把引擎计算值按单元格格式渲染为展示文本。
 */
export function formatCellValue(value: CellValue, format: CellFormat): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (!Number.isFinite(value)) return String(value);

  const decimals = Math.max(0, Math.min(4, format.decimals ?? 0));
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  switch (format.type) {
    case 'currency':
      return `${sign}¥${abs.toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    case 'percent':
      return `${sign}${(abs * 100).toFixed(decimals)}%`;
    case 'number':
    default:
      return `${sign}${abs.toLocaleString('zh-CN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })}`;
  }
}
