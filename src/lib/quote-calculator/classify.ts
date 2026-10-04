// ============================================================
// 单元格内容自动分类
//
// 用户只输入内容，系统自动判断是数字、公式还是备注：
//   1. 空内容                        → 输入格（空值，计算时按 0）
//   2. 以 ' 开头                     → 备注（强制文本，类似 Excel 的撇号前缀）
//   3. 以 =（或 ＝）开头             → 公式
//   4. 含 @                          → 公式（@ 为单元格引用标记，输入时联想名称）
//   5. 纯数字（含千分位/小数/正负号） → 输入格数字
//   6. 含公式语法字符 且 含指示字符   → 公式
//      （指示字符 = 括号 / % / & / 比较符 / 字母 / 中文，即可能构成引用或函数的内容）
//   7. 其它                          → 备注文本（可被公式引用，如 IF(目的国="尼日利亚",...)）
//
// 说明：
//   - 纯数字运算（如 1+2）不会被当作公式，避免与日期/编号（2024-01-05）混淆；
//     需要计算时以 = 开头（=1+2）。
//   - 公式中引用未定义的单元格名称会由引擎报 #NAME 错误。
// ============================================================

import type { CellKind } from './types';

export interface ClassifiedContent {
  kind: CellKind;
  value: string;
  formula: string;
}

/** 纯数字：可选正负号 + 整数（支持千分位）+ 可选小数 */
const NUMBER_RE = /^[+-]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/;

/** 公式语法字符：运算符 / 括号 / 逗号 / 比较符（含全角与 ×÷） */
const SYNTAX_RE = /[+\-*/^%&(),<>=!×÷＋－＊／＾％＆（），＜＞＝！]/;

/** 公式指示字符：括号 / % / & / 比较符 / 字母 / 中文（可能构成名称引用或函数调用） */
const INDICATOR_RE = /[()（）%％&＆<>=!＜＞＝！A-Za-z\u4e00-\u9fff]/;

/** 对单元格内容做自动分类，返回可直接写入 CalcCell 的字段补丁 */
export function classifyContent(raw: string): ClassifiedContent {
  const trimmed = raw.trim();

  if (trimmed === '') return { kind: 'input', value: '', formula: '' };
  if (raw.startsWith("'")) return { kind: 'note', value: raw, formula: '' };
  if (trimmed.startsWith('=') || trimmed.startsWith('＝')) {
    return { kind: 'formula', value: '', formula: raw };
  }
  // @ 为单元格引用标记：出现即表示要引用其它单元格（邮箱等文本可用 ' 前缀强制备注）
  if (raw.includes('@')) return { kind: 'formula', value: '', formula: raw };
  if (NUMBER_RE.test(trimmed)) return { kind: 'input', value: raw, formula: '' };
  if (SYNTAX_RE.test(raw) && INDICATOR_RE.test(raw)) {
    return { kind: 'formula', value: '', formula: raw };
  }
  return { kind: 'note', value: raw, formula: '' };
}

/** 读取单元格当前可编辑的内容（公式格取 formula，其余取 value） */
export function getCellContent(cell: { kind: CellKind; value: string; formula: string }): string {
  return cell.kind === 'formula' ? cell.formula : cell.value;
}
