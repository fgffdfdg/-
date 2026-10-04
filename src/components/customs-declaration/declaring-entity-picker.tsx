'use client';

import * as React from 'react';
import { Building, Search, Check, ArrowDownToLine } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CompanyRow {
  id: string;
  company_name: string | null;
  company_name_en: string | null;
  social_credit_code: string | null;
}

const STORAGE_KEY = 'exportdrive_declaring_entities';

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(name: string) {
  if (!name.trim()) return;
  const history = loadHistory().filter((n) => n !== name);
  history.unshift(name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function DeclaringEntityPicker({
  onPick,
  consignorName,
  token,
  orgId,
}: {
  onPick: (name: string) => void;
  consignorName?: string;
  token: string | null;
  orgId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState('');
  const [rows, setRows] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>(() => loadHistory());

  const search = React.useCallback(
    async (kw: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ search: kw, limit: '20' });
        if (orgId) qs.set('organization_id', orgId);
        const res = await fetch(`/api/company-profiles?${qs.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = (await res.json().catch(() => ({}))) as { data?: CompanyRow[]; error?: string };
        if (!res.ok) throw new Error(json.error || '加载失败');
        setRows(json.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [token, orgId],
  );

  React.useEffect(() => {
    if (!open) return;
    setHistory(loadHistory());
    search('');
  }, [open, search]);

  const handlePick = (name: string) => {
    saveHistory(name);
    onPick(name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium whitespace-nowrap"
        >
          <Building className="w-3.5 h-3.5" />
          选择/复用
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* 快捷操作 */}
        {consignorName && (
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-surface-container/70 border-b border-outline-variant/30"
            onClick={() => handlePick(consignorName)}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            填入发货人：{consignorName}
          </button>
        )}

        {/* 搜索企业库 */}
        <div className="flex items-center border-b border-outline-variant/30 px-3 py-2 gap-2">
          <Search className="w-3.5 h-3.5 text-on-surface-variant" />
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              search(e.target.value);
            }}
            placeholder="搜索企业名称"
            className="border-0 h-8 shadow-none focus-visible:ring-0 px-0"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {/* 历史记录 */}
          {!keyword && history.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">
                最近使用
              </div>
              {history.slice(0, 5).map((name) => (
                <button
                  type="button"
                  key={name}
                  className="w-full text-left px-3 py-2 hover:bg-surface-container/70 flex items-center gap-2 text-xs"
                  onClick={() => handlePick(name)}
                >
                  <Check className="w-3 h-3 text-primary opacity-0" />
                  <span className="text-on-surface truncate">{name}</span>
                </button>
              ))}
              {rows.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide pt-2">
                  企业库搜索结果
                </div>
              )}
            </>
          )}

          {loading ? (
            <div className="text-center text-xs text-on-surface-variant py-6">加载中…</div>
          ) : rows.length === 0 && keyword ? (
            <div className="text-center text-xs text-on-surface-variant py-6">未找到匹配企业</div>
          ) : !keyword && history.length === 0 ? (
            <div className="text-center text-xs text-on-surface-variant py-6">输入关键词搜索企业库</div>
          ) : (
            rows.map((r) => (
              <button
                type="button"
                key={r.id}
                className="w-full text-left px-3 py-2 hover:bg-surface-container/70 flex items-start gap-2 text-xs"
                onClick={() => handlePick(r.company_name || r.company_name_en || '')}
              >
                <Check className="w-3 h-3 mt-0.5 text-primary opacity-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-on-surface truncate">
                    {r.company_name || r.company_name_en}
                  </div>
                  {r.social_credit_code && (
                    <div className="text-[10px] font-mono text-on-surface-variant truncate">
                      {r.social_credit_code}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}