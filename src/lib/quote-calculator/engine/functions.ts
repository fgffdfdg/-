// ============================================================
// 公式引擎 - 内置函数库
// 参数以 AST + 惰性求值函数传入（IF / IFERROR 等按需求值）。
// ============================================================

import type { AstNode, CellValue, ErrorCode, EvalResult } from './types';

export type LazyEval = (node: AstNode) => EvalResult;

export interface FnDef {
  minArgs: number;
  maxArgs: number;
  impl: (args: AstNode[], ev: LazyEval) => EvalResult;
}

// ------------------------------------------------------------
// 结果构造 & 值强制转换
// ------------------------------------------------------------

export function ok(value: CellValue): EvalResult {
  return { ok: true, value };
}

export function fail(code: ErrorCode, message: string): EvalResult {
  return { ok: false, error: { code, message } };
}

/**
 * 把单元格值转为数字：
 * - number → 原值
 * - null(空) → 0
 * - boolean → 1 / 0
 * - string → 去除千分位逗号后尝试解析；空串为 0；失败返回 null
 */
export function coerceNumber(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = v.trim().replace(/,/g, '');
  if (s === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 严格数字转换：失败返回 #VALUE! 错误 */
export function requireNumber(v: CellValue, context: string): number | EvalResult {
  const n = coerceNumber(v);
  if (n === null) {
    return fail('VALUE', `${context}需要数字，无法转换 "${toDisplayText(v)}"`);
  }
  return n;
}

export function coerceBool(v: CellValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  const s = v.trim();
  if (!s) return false;
  if (s.toUpperCase() === 'FALSE') return false;
  const n = Number(s.replace(/,/g, ''));
  if (Number.isFinite(n)) return n !== 0;
  return true;
}

/** 值 → 展示文本（用于 & 连接与 CONCAT） */
export function toDisplayText(v: CellValue): string {
  if (v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

/** 聚合函数：收集所有可转数字的参数（跳过空值/布尔/无法解析的文本） */
function collectNumbers(args: AstNode[], ev: LazyEval): { nums: number[] } | { error: EvalResult } {
  const nums: number[] = [];
  for (const a of args) {
    const r = ev(a);
    if (!r.ok) return { error: r };
    const v = r.value;
    if (v === null || typeof v === 'boolean') continue;
    const n = coerceNumber(v);
    if (n !== null) nums.push(n);
  }
  return { nums };
}

/** 对 ROUND / ROUNDUP / ROUNDDOWN 取整（远离零 / 向零） */
function roundTo(v: number, digits: number, mode: 'nearest' | 'up' | 'down'): number {
  const d = Math.max(-10, Math.min(10, Math.trunc(digits)));
  const m = Math.pow(10, d);
  const abs = Math.abs(v) * m;
  let r: number;
  if (mode === 'nearest') r = Math.floor(abs + 0.5 + 1e-9);
  else if (mode === 'up') r = Math.ceil(abs - 1e-12);
  else r = Math.floor(abs + 1e-12);
  const out = r / m;
  return v < 0 ? -out : out;
}

/** 求值并严格转为数字（通用参数处理） */
function evalNumber(arg: AstNode | undefined, ev: LazyEval, context: string, fallback?: number): number | EvalResult {
  if (!arg) {
    if (fallback !== undefined) return fallback;
    return fail('VALUE', `${context}缺少参数`);
  }
  const r = ev(arg);
  if (!r.ok) return r;
  return requireNumber(r.value, context);
}

function isErr(x: number | EvalResult): x is EvalResult {
  return typeof x === 'object' && x !== null && 'ok' in x && !x.ok;
}

// ------------------------------------------------------------
// 函数表
// ------------------------------------------------------------

export const FUNCTIONS: Record<string, FnDef> = {
  // ---------- 聚合 ----------
  SUM: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      const r = collectNumbers(args, ev);
      if ('error' in r) return r.error;
      return ok(r.nums.reduce((s, x) => s + x, 0));
    },
  },
  AVERAGE: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      const r = collectNumbers(args, ev);
      if ('error' in r) return r.error;
      if (r.nums.length === 0) return fail('DIV0', 'AVERAGE 没有可计算的数值');
      return ok(r.nums.reduce((s, x) => s + x, 0) / r.nums.length);
    },
  },
  COUNT: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      const r = collectNumbers(args, ev);
      if ('error' in r) return r.error;
      return ok(r.nums.length);
    },
  },
  MIN: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      const r = collectNumbers(args, ev);
      if ('error' in r) return r.error;
      return ok(r.nums.length === 0 ? 0 : Math.min(...r.nums));
    },
  },
  MAX: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      const r = collectNumbers(args, ev);
      if ('error' in r) return r.error;
      return ok(r.nums.length === 0 ? 0 : Math.max(...r.nums));
    },
  },

  // ---------- 取整 / 数值 ----------
  ROUND: {
    minArgs: 1,
    maxArgs: 2,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'ROUND');
      if (isErr(v)) return v;
      const d = evalNumber(args[1], ev, 'ROUND 位数', 0);
      if (isErr(d)) return d;
      return ok(roundTo(v, d, 'nearest'));
    },
  },
  ROUNDUP: {
    minArgs: 1,
    maxArgs: 2,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'ROUNDUP');
      if (isErr(v)) return v;
      const d = evalNumber(args[1], ev, 'ROUNDUP 位数', 0);
      if (isErr(d)) return d;
      return ok(roundTo(v, d, 'up'));
    },
  },
  ROUNDDOWN: {
    minArgs: 1,
    maxArgs: 2,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'ROUNDDOWN');
      if (isErr(v)) return v;
      const d = evalNumber(args[1], ev, 'ROUNDDOWN 位数', 0);
      if (isErr(d)) return d;
      return ok(roundTo(v, d, 'down'));
    },
  },
  INT: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'INT');
      if (isErr(v)) return v;
      return ok(Math.floor(v));
    },
  },
  ABS: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'ABS');
      if (isErr(v)) return v;
      return ok(Math.abs(v));
    },
  },
  MOD: {
    minArgs: 2,
    maxArgs: 2,
    impl: (args, ev) => {
      const a = evalNumber(args[0], ev, 'MOD');
      if (isErr(a)) return a;
      const b = evalNumber(args[1], ev, 'MOD');
      if (isErr(b)) return b;
      if (b === 0) return fail('DIV0', 'MOD 除数不能为 0');
      return ok(a - Math.floor(a / b) * b);
    },
  },
  POWER: {
    minArgs: 2,
    maxArgs: 2,
    impl: (args, ev) => {
      const a = evalNumber(args[0], ev, 'POWER');
      if (isErr(a)) return a;
      const b = evalNumber(args[1], ev, 'POWER');
      if (isErr(b)) return b;
      const out = Math.pow(a, b);
      if (!Number.isFinite(out)) return fail('NUM', 'POWER 计算结果超出范围');
      return ok(out);
    },
  },
  SQRT: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const v = evalNumber(args[0], ev, 'SQRT');
      if (isErr(v)) return v;
      if (v < 0) return fail('NUM', 'SQRT 不能对负数开方');
      return ok(Math.sqrt(v));
    },
  },

  // ---------- 逻辑 ----------
  IF: {
    minArgs: 2,
    maxArgs: 3,
    impl: (args, ev) => {
      const cond = ev(args[0]);
      if (!cond.ok) return cond;
      if (coerceBool(cond.value)) return ev(args[1]);
      return args.length >= 3 ? ev(args[2]) : ok(0);
    },
  },
  IFERROR: {
    minArgs: 1,
    maxArgs: 2,
    impl: (args, ev) => {
      const r = ev(args[0]);
      if (r.ok) return r;
      return args.length >= 2 ? ev(args[1]) : ok(null);
    },
  },
  AND: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      for (const a of args) {
        const r = ev(a);
        if (!r.ok) return r;
        if (!coerceBool(r.value)) return ok(false);
      }
      return ok(true);
    },
  },
  OR: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      for (const a of args) {
        const r = ev(a);
        if (!r.ok) return r;
        if (coerceBool(r.value)) return ok(true);
      }
      return ok(false);
    },
  },
  NOT: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const r = ev(args[0]);
      if (!r.ok) return r;
      return ok(!coerceBool(r.value));
    },
  },

  // ---------- 文本 ----------
  CONCAT: {
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ev) => {
      let out = '';
      for (const a of args) {
        const r = ev(a);
        if (!r.ok) return r;
        out += toDisplayText(r.value);
      }
      return ok(out);
    },
  },
  LEN: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const r = ev(args[0]);
      if (!r.ok) return r;
      return ok(toDisplayText(r.value).length);
    },
  },
  UPPER: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const r = ev(args[0]);
      if (!r.ok) return r;
      return ok(toDisplayText(r.value).toUpperCase());
    },
  },
  LOWER: {
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ev) => {
      const r = ev(args[0]);
      if (!r.ok) return r;
      return ok(toDisplayText(r.value).toLowerCase());
    },
  },
};
