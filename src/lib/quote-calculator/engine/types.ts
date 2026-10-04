// ============================================================
// 公式引擎 - 类型定义
// 纯 TS、零依赖、框架无关。
// 公式通过"中文变量名"引用其它单元格，例如：
//   IF(车辆采购价 > 200000, 车辆采购价 * 5%, 3000) + 海运费
// ============================================================

/** 单元格计算值 */
export type CellValue = number | string | boolean | null;

/** 错误码（对齐 Excel 语义） */
export type ErrorCode =
  | 'DIV0'   // 除以零
  | 'CYCLE'  // 循环引用
  | 'NAME'   // 未知名称 / 名称重复
  | 'VALUE'  // 值类型错误
  | 'REF'    // 引用无效（被引用格计算失败）
  | 'NUM'    // 数值域错误（如负数开方）
  | 'PARSE'; // 公式语法错误

export interface FormulaError {
  code: ErrorCode;
  message: string;
}

export type EvalResult =
  | { ok: true; value: CellValue }
  | { ok: false; error: FormulaError };

// ------------------------------------------------------------
// 词法 Token（带位置信息，供变量改名时做精准替换）
// ------------------------------------------------------------

interface TokenBase {
  /** 原始字符串中的起始下标 */
  start: number;
  /** 原始字符串中的结束下标（不含） */
  end: number;
  /** 原始文本 */
  text: string;
}

export type Token =
  | (TokenBase & { type: 'number'; value: number })
  | (TokenBase & { type: 'string'; value: string })
  | (TokenBase & { type: 'bool'; value: boolean })
  | (TokenBase & { type: 'name'; name: string })
  | (TokenBase & { type: 'func'; name: string })
  | (TokenBase & { type: 'op'; op: '+' | '-' | '*' | '/' | '^' | '&' })
  | (TokenBase & { type: 'compare'; op: '=' | '<>' | '<' | '>' | '<=' | '>=' })
  | (TokenBase & { type: 'lparen' })
  | (TokenBase & { type: 'rparen' })
  | (TokenBase & { type: 'comma' })
  | (TokenBase & { type: 'percent' });

// ------------------------------------------------------------
// 语法 AST
// ------------------------------------------------------------

export type AstNode =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'ref'; name: string }
  | { kind: 'bin'; op: string; left: AstNode; right: AstNode }
  | { kind: 'un'; op: '-' | '+'; operand: AstNode }
  | { kind: 'pct'; operand: AstNode }
  | { kind: 'call'; name: string; args: AstNode[] };

/** 公式解析结果 */
export interface ParseOutput {
  ast: AstNode | null;
  error: FormulaError | null;
  /** 公式中引用到的变量名列表（去重、按出现顺序） */
  refs: string[];
}
