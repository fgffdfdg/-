// ============================================================
// 公式引擎 - AST 求值器
// ============================================================

import type { AstNode, CellValue, EvalResult } from './types';
import { FUNCTIONS, coerceNumber, coerceBool, fail, ok, toDisplayText } from './functions';

/** 变量名 → 该单元格已计算好的值 */
export type NameResolver = (name: string) => EvalResult;

/** 比较两个值，返回 -1 / 0 / 1 */
function compareValues(l: CellValue, r: CellValue): number {
  // 两侧都可转数字（含纯数字）→ 数值比较
  if (typeof l === 'number' || typeof r === 'number' || typeof l === 'boolean' || typeof r === 'boolean') {
    const ln = coerceNumber(l);
    const rn = coerceNumber(r);
    if (ln !== null && rn !== null) {
      return ln < rn ? -1 : ln > rn ? 1 : 0;
    }
  }
  if (typeof l === 'boolean' && typeof r === 'boolean') {
    return l === r ? 0 : l ? 1 : -1;
  }
  const ls = toDisplayText(l).toLowerCase();
  const rs = toDisplayText(r).toLowerCase();
  return ls < rs ? -1 : ls > rs ? 1 : 0;
}

function applyCompare(op: string, cmp: number): boolean {
  switch (op) {
    case '=': return cmp === 0;
    case '<>': return cmp !== 0;
    case '<': return cmp < 0;
    case '>': return cmp > 0;
    case '<=': return cmp <= 0;
    case '>=': return cmp >= 0;
    default: return false;
  }
}

/**
 * 对 AST 求值。变量引用通过 resolve 回调取值（由引擎保证依赖已先计算）。
 */
export function evalAst(node: AstNode, resolve: NameResolver): EvalResult {
  switch (node.kind) {
    case 'num':
      return ok(node.value);
    case 'str':
      return ok(node.value);
    case 'bool':
      return ok(node.value);
    case 'ref':
      return resolve(node.name);

    case 'un': {
      const r = evalAst(node.operand, resolve);
      if (!r.ok) return r;
      const n = coerceNumber(r.value);
      if (n === null) return fail('VALUE', `无法对 "${toDisplayText(r.value)}" 做数值运算`);
      return ok(node.op === '-' ? -n : n);
    }

    case 'pct': {
      const r = evalAst(node.operand, resolve);
      if (!r.ok) return r;
      const n = coerceNumber(r.value);
      if (n === null) return fail('VALUE', `无法对 "${toDisplayText(r.value)}" 取百分比`);
      return ok(n / 100);
    }

    case 'bin': {
      // 文本连接
      if (node.op === '&') {
        const l = evalAst(node.left, resolve);
        if (!l.ok) return l;
        const r = evalAst(node.right, resolve);
        if (!r.ok) return r;
        return ok(toDisplayText(l.value) + toDisplayText(r.value));
      }

      const l = evalAst(node.left, resolve);
      if (!l.ok) return l;
      const r = evalAst(node.right, resolve);
      if (!r.ok) return r;

      // 比较运算
      if (node.op === '=' || node.op === '<>' || node.op === '<' || node.op === '>' || node.op === '<=' || node.op === '>=' ) {
        return ok(applyCompare(node.op, compareValues(l.value, r.value)));
      }

      // 算术运算
      const ln = coerceNumber(l.value);
      const rn = coerceNumber(r.value);
      if (ln === null) return fail('VALUE', `无法将 "${toDisplayText(l.value)}" 转换为数字`);
      if (rn === null) return fail('VALUE', `无法将 "${toDisplayText(r.value)}" 转换为数字`);

      switch (node.op) {
        case '+': return ok(ln + rn);
        case '-': return ok(ln - rn);
        case '*': return ok(ln * rn);
        case '/': {
          if (rn === 0) return fail('DIV0', '除数不能为 0');
          return ok(ln / rn);
        }
        case '^': {
          const out = Math.pow(ln, rn);
          if (!Number.isFinite(out)) return fail('NUM', '乘方结果超出范围');
          return ok(out);
        }
        default:
          return fail('VALUE', `未知运算符 "${node.op}"`);
      }
    }

    case 'call': {
      const def = FUNCTIONS[node.name];
      if (!def) return fail('NAME', `未知函数 "${node.name}"`);
      if (node.args.length < def.minArgs || node.args.length > def.maxArgs) {
        const expected = def.maxArgs === def.minArgs
          ? `${def.minArgs} 个参数`
          : `${def.minArgs}~${def.maxArgs === Infinity ? '多' : def.maxArgs} 个参数`;
        return fail('VALUE', `函数 ${node.name} 需要 ${expected}，实际传入 ${node.args.length} 个`);
      }
      return def.impl(node.args, (child) => evalAst(child, resolve));
    }

    default:
      return fail('VALUE', '未知的表达式节点');
  }
}
