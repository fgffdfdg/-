// ============================================================
// 公式引擎 - 门面（整表计算）
//
// computeAll(cells) 流程：
//   1. 名称检查（空名 / 重名）
//   2. 公式解析 + 依赖提取
//   3. 拓扑排序（Kahn），未排出的节点 = 循环引用
//   4. 按拓扑序求值；被引用格出错时向下游传播 #REF
// ============================================================

import type { AstNode, CellValue, ErrorCode, FormulaError } from './types';
import { extractRefs, normalizeFormula, parseFormula, renameReferences } from './parser';
import { evalAst } from './evaluate';
import { FUNC_NAMES } from './tokenizer';

export type { AstNode, CellValue, ErrorCode, FormulaError, EvalResult, ParseOutput } from './types';
export { parseFormula, extractRefs, renameReferences, normalizeFormula } from './parser';
export { FUNCTIONS } from './functions';

/** 引擎所需的单元格最小结构（与 UI 层 CalcCell 结构兼容） */
export interface EngineCell {
  id: string;
  name: string;
  kind: 'input' | 'formula' | 'note';
  /** 输入格的原始输入 / 说明格的文本 */
  value: string;
  /** 公式格的公式文本 */
  formula: string;
}

export interface ComputedCell {
  value: CellValue;
  error: FormulaError | null;
}

function makeError(code: ErrorCode, message: string): FormulaError {
  return { code, message };
}

/**
 * 名称归一化：去掉所有空白。
 * 单元格名称允许包含空格（如"车辆 成本"），但公式中标识符不含空白，
 * 引用一律按去空白形态匹配（公式里写 车辆成本）。
 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '');
}

/**
 * 计算整张"表格"（单元格集合），返回 cellId → 计算结果 的映射。
 * 输入格：优先解析为数字，解析不了按文本处理（支持 "尼日利亚" 这类文本输入）。
 */
export function computeAll(cells: EngineCell[]): Map<string, ComputedCell> {
  const results = new Map<string, ComputedCell>();
  if (cells.length === 0) return results;

  const byId = new Map<string, EngineCell>();
  const byName = new Map<string, EngineCell>();
  const preError = new Map<string, FormulaError>();

  // ---------- 1. 名称检查 ----------
  for (const c of cells) {
    byId.set(c.id, c);
    const nm = c.name.trim();
    if (!nm) {
      preError.set(c.id, makeError('NAME', '请为该单元格设置名称'));
      continue;
    }
    const key = normalizeName(nm);
    const existing = byName.get(key);
    if (existing) {
      preError.set(existing.id, makeError('NAME', `名称 "${nm}" 与 "${existing.name}" 重复，请修改`));
      preError.set(c.id, makeError('NAME', `名称 "${nm}" 与 "${existing.name}" 重复，请修改`));
    } else {
      byName.set(key, c);
    }
  }

  // ---------- 2. 公式解析 + 依赖提取 ----------
  const astById = new Map<string, AstNode>();
  const depsById = new Map<string, string[]>();

  for (const c of cells) {
    if (c.kind !== 'formula' || preError.has(c.id)) continue;
    const src = normalizeFormula(c.formula);
    if (!src) {
      preError.set(c.id, makeError('PARSE', '公式为空'));
      continue;
    }
    const parsed = parseFormula(src);
    if (parsed.error || !parsed.ast) {
      preError.set(c.id, parsed.error ?? makeError('PARSE', '公式解析失败'));
      continue;
    }
    astById.set(c.id, parsed.ast);
    const depIds = new Set<string>();
    for (const refName of parsed.refs) {
      const target = byName.get(refName);
      if (target) depIds.add(target.id); // 包含自引用 → 会被循环检测捕获
      // 未知名称不建边，求值时以 #NAME? 报错
    }
    depsById.set(c.id, Array.from(depIds));
  }

  // ---------- 3. 拓扑排序（Kahn） ----------
  const dependents = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const c of cells) {
    dependents.set(c.id, []);
    indegree.set(c.id, 0);
  }
  for (const [id, deps] of depsById) {
    indegree.set(id, deps.length);
    for (const d of deps) {
      dependents.get(d)?.push(id);
    }
  }
  const queue: string[] = [];
  for (const c of cells) {
    if ((indegree.get(c.id) ?? 0) === 0) queue.push(c.id);
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of dependents.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // ---------- 4. 按拓扑序求值 ----------
  const valueById = new Map<string, CellValue>();

  for (const id of order) {
    const cell = byId.get(id);
    if (!cell) continue;

    // 预置错误（重名 / 空名 / 公式解析失败）
    const pe = preError.get(id);
    if (pe) {
      results.set(id, { value: null, error: pe });
      continue;
    }

    if (cell.kind === 'input') {
      const raw = cell.value.trim().replace(/,/g, '');
      if (raw === '') {
        valueById.set(id, null);
        results.set(id, { value: null, error: null });
      } else {
        const num = Number(raw);
        const value: CellValue = Number.isFinite(num) && raw !== '' ? num : cell.value.trim();
        valueById.set(id, value);
        results.set(id, { value, error: null });
      }
      continue;
    }

    if (cell.kind === 'note') {
      valueById.set(id, cell.value);
      results.set(id, { value: cell.value, error: null });
      continue;
    }

    // formula
    const ast = astById.get(id);
    if (!ast) {
      results.set(id, { value: null, error: preError.get(id) ?? makeError('PARSE', '公式无效') });
      continue;
    }

    const r = evalAst(ast, (name: string) => {
      const target = byName.get(name);
      if (!target) {
        return { ok: false, error: makeError('NAME', `未找到名为 "${name}" 的单元格`) };
      }
      const targetResult = results.get(target.id);
      if (targetResult && targetResult.error) {
        return { ok: false, error: makeError('REF', `引用的 "${name}" 计算出错`) };
      }
      if (!valueById.has(target.id)) {
        return { ok: false, error: makeError('CYCLE', '检测到循环引用') };
      }
      return { ok: true, value: valueById.get(target.id) as CellValue };
    });

    if (r.ok) {
      valueById.set(id, r.value);
      results.set(id, { value: r.value, error: null });
    } else {
      valueById.set(id, null);
      results.set(id, { value: null, error: r.error });
    }
  }

  // ---------- 5. 未进入拓扑序的 = 循环引用 ----------
  for (const c of cells) {
    if (!results.has(c.id)) {
      results.set(c.id, { value: null, error: makeError('CYCLE', '检测到循环引用，请检查公式') });
    }
  }

  return results;
}

// ------------------------------------------------------------
// 名称合法性校验（供 UI 层新建 / 改名时使用）
// ------------------------------------------------------------

const NAME_PUNCT_RE = /[+\-*/^&%=<>!(),."']|[×÷（）＝＋－＞＜％＆！，""．、]/;

export interface NameCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * 校验单元格名称是否可安全用于公式引用。
 */
export function isValidName(name: string): NameCheckResult {
  const nm = name.trim();
  if (!nm) return { valid: false, reason: '名称不能为空' };
  if (nm.length > 20) return { valid: false, reason: '名称最长 20 个字符' };
  if (/^\d/.test(nm)) return { valid: false, reason: '名称不能以数字开头' };
  // 名称允许包含空格（公式引用时按去空白形态匹配）
  if (NAME_PUNCT_RE.test(nm)) return { valid: false, reason: '名称不能包含运算符或标点符号' };
  const upper = normalizeName(nm).toUpperCase();
  if (FUNC_NAMES.has(upper)) return { valid: false, reason: '名称不能与内置函数同名' };
  if (upper === 'TRUE' || upper === 'FALSE') return { valid: false, reason: '该名称为保留字' };
  return { valid: true };
}
