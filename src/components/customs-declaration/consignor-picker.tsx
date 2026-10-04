'use client';

import * as React from 'react';
import { Building, Search, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { DeclarationParty } from '@/lib/customs-declaration/types';

interface CompanyRow {
  id: string;
  company_name: string | null;
  company_name_en: string | null;
  social_credit_code: string | null;
  contact_phone: string | null;
  address: string | null;
}

export function ConsignorPicker({
  onPick,
  token,
  orgId,
}: {
  onPick: (p: DeclarationParty) => void;
  token: string | null;
  orgId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState('');
  const [rows, setRows] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(false);

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
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [token, orgId],
  );

  React.useEffect(() => {
    if (!open) return;
    search('');
  }, [open, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium whitespace-nowrap"
        >
          <Building className="w-3.5 h-3.5" />
          从企业库选择
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center border-b border-outline-variant/30 px-3 py-2 gap-2">
          <Search className="w-3.5 h-3.5 text-on-surface-variant" />
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              search(e.target.value);
            }}
            placeholder="搜索企业名称/信用代码"
            className="border-0 h-8 shadow-none focus-visible:ring-0 px-0"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {loading ? (
            <div className="text-center text-xs text-on-surface-variant py-6">加载中…</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-xs text-on-surface-variant py-6">未找到企业档案</div>
          ) : (
            rows.map((r) => (
              <button
                type="button"
                key={r.id}
                className="w-full text-left px-3 py-2 hover:bg-surface-container/70 flex items-start gap-2 text-xs"
                onClick={() => {
                  onPick({
                    code: r.social_credit_code || '',
                    name: r.company_name || r.company_name_en || '',
                    phone: r.contact_phone || '',
                    address: r.address || '',
                  });
                  setOpen(false);
                }}
              >
                <Check className="w-3 h-3 mt-0.5 text-primary opacity-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-on-surface truncate">{r.company_name || r.company_name_en}</div>
                  {r.social_credit_code && (
                    <div className="text-[10px] font-mono text-on-surface-variant truncate">{r.social_credit_code}</div>
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
