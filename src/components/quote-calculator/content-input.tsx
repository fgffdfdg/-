'use client';

// ============================================================
// 统一内容输入框：数字 / 公式 / 备注共用一个输入框
// 公式语境下输入 @ 触发单元格引用联想（Tab / 回车 / 点击插入），
// 直接键入名称片段同样会联想。
// 被引用的单元格名称以强调色显示（背景层高亮 + 透明文本域实现）。
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { normalizeName } from '@/lib/quote-calculator/engine';

interface ContentInputProps {
  content: string;
  onChange: (content: string) => void;
  /** 其它单元格的名称（用于联想与高亮） */
  names: string[];
  /** 当前内容是否被识别为公式（联想/高亮仅在公式语境出现） */
  formulaContext: boolean;
  placeholder?: string;
}

/** 单词边界：空白与运算符/标点（含全角）；@ 为引用触发符也作为边界 */
const STOP_RE = /[\s+\-*/^&%=<>!(),."'@×÷（）＝＋－＞＜％＆！，“”]/;

interface WordRange {
  start: number;
  end: number;
  word: string;
  /** 是否由 @ 触发的引用联想（start 指向 @ 本身） */
  mention: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function ContentInput({ content, onChange, names, formulaContext, placeholder }: ContentInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [wordRange, setWordRange] = useState<WordRange | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);

  // 自适应高度
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  const candidates = useMemo(() => {
    if (!wordRange || (!formulaContext && !wordRange.mention)) return [];
    const w = wordRange.word.toLowerCase();
    return names
      .filter((n) => {
        const nn = normalizeName(n).toLowerCase();
        // 名称允许含空格；公式中按去空白形态引用，匹配时两种形态都尝试
        return nn !== wordRange.word.toLowerCase() && (nn.includes(w) || n.toLowerCase().includes(w));
      })
      .slice(0, 8);
  }, [formulaContext, wordRange, names]);

  const showMenu = candidates.length > 0 && wordRange !== null;

  useEffect(() => {
    setMenuIndex(0);
  }, [wordRange?.word]);

  // 公式中的引用名称高亮（字符串字面量内不高亮）
  const highlighted = useMemo(() => {
    if (!formulaContext || names.length === 0 || !content) return null;
    // 公式中的引用一律为去空白形态，高亮也按去空白名称匹配
    const escaped = [...new Set(names.map(normalizeName).filter(Boolean))]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    if (escaped.length === 0) return null;
    const nameRe = new RegExp(`@?(?:${escaped.join('|')})`, 'g');

    const nodes: ReactNode[] = [];
    // 按双引号字符串切分：奇数段为字符串字面量，不高亮
    const parts = content.split(/("[^"]*")/g);
    parts.forEach((part, pi) => {
      if (!part) return;
      if (pi % 2 === 1) {
        nodes.push(part);
        return;
      }
      let last = 0;
      let seq = 0;
      for (const m of part.matchAll(nameRe)) {
        const idx = m.index ?? 0;
        const before = part[idx - 1];
        const after = part[idx + m[0].length];
        // 名称需位于词边界（起止为运算符/空白/边界），避免命中更长标识符的一部分
        const boundaryOk =
          (before === undefined || STOP_RE.test(before)) &&
          (after === undefined || STOP_RE.test(after));
        if (!boundaryOk) continue;
        if (idx > last) nodes.push(part.slice(last, idx));
        nodes.push(
          <span key={`ref-${pi}-${seq++}`} className="text-orange">
            {m[0]}
          </span>,
        );
        last = idx + m[0].length;
      }
      if (last < part.length) nodes.push(part.slice(last));
    });
    return nodes;
  }, [content, names, formulaContext]);

  const updateWordAtCursor = (el: HTMLTextAreaElement) => {
    const cursor = el.selectionStart ?? el.value.length;
    let start = cursor;
    while (start > 0 && !STOP_RE.test(el.value[start - 1])) start -= 1;
    const word = el.value.slice(start, cursor);
    // @ 引用：单词紧邻 @（含光标刚落在 @ 之后、片段为空的情况）。
    // @ 本身会把内容分类为公式，此处不受 formulaContext 门控，保证首次键入 @ 立即联想。
    if (start > 0 && el.value[start - 1] === '@') {
      setWordRange({ start: start - 1, end: cursor, word, mention: true });
      return;
    }
    if (!formulaContext) {
      setWordRange(null);
      return;
    }
    setWordRange(word ? { start, end: cursor, word, mention: false } : null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    updateWordAtCursor(e.target);
  };

  const commitCandidate = (name: string) => {
    if (!wordRange) return;
    // 插入去空白形态（公式标识符不含空格）
    const insert = normalizeName(name);
    const next = content.slice(0, wordRange.start) + insert + content.slice(wordRange.end);
    onChange(next);
    setWordRange(null);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.focus();
        const pos = wordRange.start + insert.length;
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        commitCandidate(candidates[menuIndex] ?? candidates[0]);
        return;
      }
      if (e.key === 'Escape') {
        setWordRange(null);
        return;
      }
    }
    // 回车结束编辑（备注换行用 Shift+Enter）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  // 与输入层完全一致的排版类（背景层与文本域必须同字体同间距，高亮才能对齐）
  const sharedTypo = 'border px-2.5 py-1.5 font-mono text-sm';

  return (
    <div className="relative">
      {/* 背景层：渲染高亮后的文本（只读展示） */}
      <div
        ref={backdropRef}
        aria-hidden
        className={cn(
          sharedTypo,
          'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border-transparent bg-background text-foreground',
        )}
      >
        {highlighted ?? content}
        {'\n'}
      </div>

      {/* 输入层：文字透明，保留光标与选区 */}
      <textarea
        ref={taRef}
        value={content}
        rows={1}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateWordAtCursor(e.target as HTMLTextAreaElement)}
        onScroll={(e) => {
          if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        onBlur={() => setWordRange(null)}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          sharedTypo,
          'relative z-10 block w-full resize-none overflow-y-auto rounded-md border-border bg-transparent text-transparent caret-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary',
        )}
      />

      {/* 单元格名称联想下拉 */}
      {showMenu && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="border-b border-border/60 px-3 py-1 text-[10px] text-muted-foreground">
            {wordRange?.mention ? '用 @ 引用单元格（Tab / 回车插入）' : '插入已有单元格名称（Tab / 回车）'}
          </div>
          {candidates.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commitCandidate(name);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
                i === menuIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
              )}
            >
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">单元格</span>
              <span className="truncate">{name}</span>
              {normalizeName(name) !== name && (
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">引用时写作 {normalizeName(name)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
