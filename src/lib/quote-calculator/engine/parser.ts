// ============================================================
// 公式引擎 - 语法解析器（递归下降）
//
// 优先级（低 → 高）：
//   比较 (= <> < > <= >=)
//   文本连接 (&)
//   加减 (+ -)
//   乘除 (* /)
//   乘方 (^，右结合)
//   一元正负 (- +)
//   百分号 (50%)
//   基本项 (数字 / 字符串 / 布尔 / 变量引用 / 函数调用 / 括号)
// ============================================================

import type { AstNode, FormulaError, ParseOutput, Token } from './types';
import { tokenize } from './tokenizer';

/** 函数别名归一化 */
const FUNC_ALIASES: Record<string, string> = {
  AVG: 'AVERAGE',
  CONCATENATE: 'CONCAT',
};

/**
 * 公式归一化：
 * - 全角符号 → 半角（× ÷ （ ） ， ＝ ＋ － ＞ ＜ ％ ＆ ！ 引号 数字）
 * - 去掉开头的 "="（兼容 Excel 输入习惯）
 */
export function normalizeFormula(src: string): string {
  let s = src
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/，/g, ',')
    .replace(/＝/g, '=')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/＞/g, '>')
    .replace(/＜/g, '<')
    .replace(/％/g, '%')
    .replace(/＆/g, '&')
    .replace(/！/g, '!')
    .replace(/[“”]/g, '"')
    // @ 为单元格引用标记（输入时联想插入），求值时等价于直接写名称
    .replace(/@/g, '');
  // 去掉开头连续的比较号（Excel 习惯以 = 开头）
  s = s.replace(/^\s*(?:=|<>|<=|>=|<|>)+\s*/, '');
  return s.trim();
}

class ParseError extends Error {}

class Parser {
  private pos = 0;
  private readonly refSet = new Set<string>();

  constructor(private readonly tokens: Token[]) {}

  refs(): string[] {
    return Array.from(this.refSet);
  }

  parse(): AstNode {
    const node = this.parseCompare();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      throw new ParseError(`意外的符号 "${t.text}"`);
    }
    return node;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private next(): Token | null {
    return this.tokens[this.pos++] ?? null;
  }

  private parseCompare(): AstNode {
    let left = this.parseConcat();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'compare') {
        this.next();
        const right = this.parseConcat();
        left = { kind: 'bin', op: t.op, left, right };
      } else {
        return left;
      }
    }
  }

  private parseConcat(): AstNode {
    let left = this.parseAdditive();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'op' && t.op === '&') {
        this.next();
        const right = this.parseAdditive();
        left = { kind: 'bin', op: '&', left, right };
      } else {
        return left;
      }
    }
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.op === '+' || t.op === '-')) {
        this.next();
        const right = this.parseMultiplicative();
        left = { kind: 'bin', op: t.op, left, right };
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): AstNode {
    let left = this.parsePower();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.op === '*' || t.op === '/')) {
        this.next();
        const right = this.parsePower();
        left = { kind: 'bin', op: t.op, left, right };
      } else {
        return left;
      }
    }
  }

  private parsePower(): AstNode {
    const base = this.parseUnary();
    const t = this.peek();
    if (t && t.type === 'op' && t.op === '^') {
      this.next();
      const exp = this.parsePower(); // 右结合
      return { kind: 'bin', op: '^', left: base, right: exp };
    }
    return base;
  }

  private parseUnary(): AstNode {
    const t = this.peek();
    if (t && t.type === 'op' && (t.op === '-' || t.op === '+')) {
      this.next();
      const operand = this.parseUnary();
      return { kind: 'un', op: t.op, operand };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): AstNode {
    let node = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'percent') {
        this.next();
        node = { kind: 'pct', operand: node };
      } else {
        return node;
      }
    }
  }

  private parsePrimary(): AstNode {
    const t = this.next();
    if (!t) {
      throw new ParseError('表达式不完整（末尾缺少操作数）');
    }

    switch (t.type) {
      case 'number':
        return { kind: 'num', value: t.value };
      case 'string':
        return { kind: 'str', value: t.value };
      case 'bool':
        return { kind: 'bool', value: t.value };
      case 'name':
        this.refSet.add(t.name);
        return { kind: 'ref', name: t.name };
      case 'func':
        return this.parseCall(t.name);
      case 'lparen': {
        const inner = this.parseCompare();
        const closing = this.next();
        if (!closing || closing.type !== 'rparen') {
          throw new ParseError('缺少右括号 ")"');
        }
        return inner;
      }
      case 'op':
        throw new ParseError(`运算符 "${t.text}" 的位置不正确`);
      case 'compare':
        throw new ParseError(`比较符 "${t.text}" 的位置不正确`);
      case 'rparen':
        throw new ParseError('多余的右括号 ")"');
      case 'comma':
        throw new ParseError('逗号 "," 的位置不正确');
      case 'percent':
        throw new ParseError('百分号 "%" 前缺少数值');
      default:
        throw new ParseError('意外的符号');
    }
  }

  private parseCall(funcName: string): AstNode {
    const opening = this.next();
    if (!opening || opening.type !== 'lparen') {
      throw new ParseError(`函数 ${funcName} 后缺少左括号 "("`);
    }
    const args: AstNode[] = [];
    const closing = this.peek();
    if (closing && closing.type === 'rparen') {
      this.next();
      return { kind: 'call', name: FUNC_ALIASES[funcName] ?? funcName, args };
    }
    for (;;) {
      args.push(this.parseCompare());
      const t = this.next();
      if (!t) {
        throw new ParseError(`函数 ${funcName} 缺少右括号 ")"`);
      }
      if (t.type === 'comma') continue;
      if (t.type === 'rparen') break;
      throw new ParseError(`函数 ${funcName} 参数列表格式错误`);
    }
    return { kind: 'call', name: FUNC_ALIASES[funcName] ?? funcName, args };
  }
}

/**
 * 解析公式字符串，返回 AST / 错误 / 引用变量列表。
 */
export function parseFormula(rawSource: string): ParseOutput {
  const src = normalizeFormula(rawSource);
  if (!src) {
    return { ast: null, error: { code: 'PARSE', message: '公式为空' }, refs: [] };
  }
  const { tokens, error } = tokenize(src);
  if (error) {
    return { ast: null, error: { code: 'PARSE', message: error }, refs: [] };
  }
  if (tokens.length === 0) {
    return { ast: null, error: { code: 'PARSE', message: '公式为空' }, refs: [] };
  }
  try {
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return { ast, error: null, refs: parser.refs() };
  } catch (e) {
    const message = e instanceof ParseError ? e.message : '公式语法错误';
    return { ast: null, error: { code: 'PARSE', message }, refs: [] };
  }
}

/**
 * 提取公式中引用的变量名（不做完整语法校验，容错性高）。
 */
export function extractRefs(rawSource: string): string[] {
  const src = normalizeFormula(rawSource);
  if (!src) return [];
  const { tokens, error } = tokenize(src);
  if (error) return [];
  const seen = new Set<string>();
  const refs: string[] = [];
  for (const t of tokens) {
    if (t.type === 'name' && !seen.has(t.name)) {
      seen.add(t.name);
      refs.push(t.name);
    }
  }
  return refs;
}

/**
 * 把公式中对 oldName 的引用替换为 newName。
 * 基于词法位置做整词替换，不会误伤包含关系（如 "车价" 不会误改 "车价折扣"）。
 */
export function renameReferences(rawFormula: string, oldName: string, newName: string): string {
  // 公式中的标识符不含空白，名称统一按"去空白"形态匹配与写入
  const oldNorm = oldName.replace(/\s+/g, '');
  const newNorm = newName.replace(/\s+/g, '');
  if (!oldNorm || oldNorm === newNorm) return rawFormula;
  const { tokens, error } = tokenize(rawFormula);
  if (error) return rawFormula;
  let result = '';
  let cursor = 0;
  for (const t of tokens) {
    if (t.type === 'name' && t.name === oldNorm) {
      result += rawFormula.slice(cursor, t.start) + newNorm;
      cursor = t.end;
    }
  }
  result += rawFormula.slice(cursor);
  return result;
}

export type { FormulaError };
