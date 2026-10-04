// ============================================================
// 公式引擎 - 词法分析器
// 支持中文变量名：任何"非运算符/非标点/非空白"的连续字符
// 序列都被视为一个标识符，因此中文名天然可被整体识别。
// ============================================================

import type { Token } from './types';

/** 内置函数名（大写），用于把标识符归类为函数调用 */
export const FUNC_NAMES: ReadonlySet<string> = new Set([
  'SUM', 'AVERAGE', 'AVG', 'COUNT', 'MIN', 'MAX',
  'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS', 'MOD', 'POWER', 'SQRT',
  'IF', 'IFERROR', 'AND', 'OR', 'NOT',
  'CONCAT', 'CONCATENATE', 'LEN', 'UPPER', 'LOWER',
]);

/** 单字符终止符（运算符 / 标点） */
const STOP_CHARS: ReadonlySet<string> = new Set([
  '+', '-', '*', '/', '^', '&', '%', '(', ')', ',', '"', '.',
]);

/** 比较运算符起始字符 */
const COMPARE_START: ReadonlySet<string> = new Set(['=', '<', '>', '!']);

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** 向后看下一个非空白字符 */
function peekNextNonSpace(src: string, from: number): string {
  let i = from;
  while (i < src.length && isWhitespace(src[i])) i += 1;
  return src[i] ?? '';
}

export interface TokenizeResult {
  tokens: Token[];
  error: string | null;
}

/**
 * 把公式字符串切分为 Token 序列。
 * 不做任何语义检查（名称是否存在留给求值阶段）。
 */
export function tokenize(src: string): TokenizeResult {
  const tokens: Token[] = [];
  const n = src.length;
  let i = 0;

  while (i < n) {
    const ch = src[i];

    if (isWhitespace(ch)) {
      i += 1;
      continue;
    }

    const start = i;

    // 数字（支持 .5 开头）
    if (isDigit(ch) || (ch === '.' && i + 1 < n && isDigit(src[i + 1]))) {
      let j = i;
      while (j < n && isDigit(src[j])) j += 1;
      if (j < n && src[j] === '.') {
        j += 1;
        while (j < n && isDigit(src[j])) j += 1;
      }
      const text = src.slice(i, j);
      tokens.push({ type: 'number', value: parseFloat(text), start, end: j, text });
      i = j;
      continue;
    }

    // 字符串 "..."（"" 表示转义的引号）
    if (ch === '"') {
      let j = i + 1;
      let buf = '';
      let closed = false;
      while (j < n) {
        if (src[j] === '"') {
          if (j + 1 < n && src[j + 1] === '"') {
            buf += '"';
            j += 2;
            continue;
          }
          closed = true;
          break;
        }
        buf += src[j];
        j += 1;
      }
      if (!closed) {
        return { tokens: [], error: '字符串缺少结束引号' };
      }
      tokens.push({ type: 'string', value: buf, start, end: j + 1, text: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // 比较运算符（双字符优先）
    if (COMPARE_START.has(ch)) {
      const two = src.slice(i, i + 2);
      if (two === '<=' || two === '>=' || two === '<>' || two === '!=') {
        tokens.push({ type: 'compare', op: two === '!=' ? '<>' : two, start, end: i + 2, text: two });
        i += 2;
      } else if (ch === '=' || ch === '<' || ch === '>') {
        tokens.push({ type: 'compare', op: ch, start, end: i + 1, text: ch });
        i += 1;
      } else {
        // 孤立的 '!'
        return { tokens: [], error: `无法识别的符号 "${ch}"` };
      }
      continue;
    }

    // 算术 / 连接运算符
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '&') {
      tokens.push({ type: 'op', op: ch, start, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === '%') {
      tokens.push({ type: 'percent', start, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', start, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', start, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', start, end: i + 1, text: ch });
      i += 1;
      continue;
    }

    // 标识符：连续读取到终止符 / 空白为止
    let j = i;
    while (j < n) {
      const c = src[j];
      if (isWhitespace(c) || STOP_CHARS.has(c) || COMPARE_START.has(c)) break;
      j += 1;
    }
    if (j === i) {
      return { tokens: [], error: `无法识别的符号 "${ch}"` };
    }

    const text = src.slice(i, j);
    const upper = text.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE') {
      tokens.push({ type: 'bool', value: upper === 'TRUE', start, end: j, text });
    } else if (FUNC_NAMES.has(upper) && peekNextNonSpace(src, j) === '(') {
      tokens.push({ type: 'func', name: upper, start, end: j, text });
    } else {
      tokens.push({ type: 'name', name: text, start, end: j, text });
    }
    i = j;
  }

  return { tokens, error: null };
}
