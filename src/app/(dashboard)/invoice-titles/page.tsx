'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Copy,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listInvoiceTitles,
  deleteInvoiceTitle,
  updateInvoiceTitle,
  maskBankAccount,
  formatDateTime,
} from '@/lib/invoice-tax/client';
import type { InvoiceTitle, InvoiceTitleType } from '@/lib/invoice-tax/types';

const TYPE_LABEL: Record<InvoiceTitleType, string> = {
  own_company: '本公司',
  partner: '合作方',
};

type FilterType = InvoiceTitleType | 'all';
type SortKey = 'recent' | 'name' | 'recent_used';

export default function InvoiceTitlesPage() {
  const { token, loading: authLoading } = useAuth();
  const { organization } = useOrg();
  const [items, setItems] = useState<InvoiceTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    if (authLoading || !token) return;
    setLoading(true);
    try {
      // token 来自 useAuth()
      const res = await listInvoiceTitles(token, {
        organizationId: organization?.id ?? null,
        limit: 200,
      });
      setItems(res.data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token, organization?.id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      own_company: items.filter((i) => i.title_type === 'own_company').length,
      partner: items.filter((i) => i.title_type === 'partner').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    const result = items.filter((i) => {
      if (filterType !== 'all' && i.title_type !== filterType) return false;
      if (kw) {
        const haystack = [
          i.company_name,
          i.company_name_en,
          i.tax_id,
          i.overseas_tax_id,
          i.contact_name,
          i.bank_name,
          i.remark,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
    if (sort === 'name') {
      result.sort((a, b) => a.company_name.localeCompare(b.company_name, 'zh-CN'));
    } else if (sort === 'recent_used') {
      result.sort((a, b) => {
        const av = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bv = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return bv - av;
      });
    } else {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return result;
  }, [items, filterType, search, sort]);

  const allChecked = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const someChecked = filtered.some((i) => selected.has(i.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const copyText = async (text: string | null | undefined, label = '已复制到剪贴板') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(label);
    } catch {
      showToast('复制失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此发票抬头吗？删除后无法恢复。')) return;
    try {
      // token 来自 useAuth()
      await deleteInvoiceTitle(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      showToast('已删除');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // token 来自 useAuth()
      await updateInvoiceTitle(token, id, { is_default: true });
      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          is_default: i.id === id,
        })),
      );
      showToast('已设为默认抬头');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条抬头吗？`)) return;
    try {
      // token 来自 useAuth()
      await Promise.all(Array.from(selected).map((id) => deleteInvoiceTitle(token, id)));
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      showToast('批量删除完成');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '批量删除失败');
    }
  };

  return (
    <div className="space-y-5">
      {/* 标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">常用发票抬头</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            维护本公司与合作方发票抬头信息，开票时一键填充，支持快速复制税号、地址、银行账号
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/invoice-titles/new">
            <Plus className="mr-1.5 h-4 w-4" />
            新增抬头
          </Link>
        </Button>
      </div>

      {/* 帮助提示 */}
      {showHelp && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-sm text-foreground">
            抬头数据将被其他模块调用，包括形式发票、商业发票、报关单据等。建议优先维护一个「本公司」默认抬头，并将常用海外买家加入「合作方」。
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'all' as FilterType, label: '全部', count: counts.all, tone: 'bg-foreground text-background' },
          {
            key: 'own_company' as FilterType,
            label: '本公司',
            count: counts.own_company,
            tone: 'bg-primary text-primary-foreground',
          },
          {
            key: 'partner' as FilterType,
            label: '合作方',
            count: counts.partner,
            tone: 'bg-warning text-warning-foreground',
          },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilterType(s.key)}
            className={`rounded-lg border p-4 text-left transition-all ${
              filterType === s.key
                ? `border-transparent ${s.tone} shadow-sm`
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <p className={`text-2xl font-bold ${filterType === s.key ? '' : 'text-foreground'}`}>
              {s.count}
            </p>
            <p
              className={`mt-1 text-xs ${
                filterType === s.key ? 'opacity-90' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </p>
          </button>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索公司名称、税号、联系人"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">最近更新</SelectItem>
            <SelectItem value="name">名称 A-Z</SelectItem>
            <SelectItem value="recent_used">最近使用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 表格 */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <Checkbox checked={allChecked} onCheckedChange={toggleSelectAll} aria-label="全选" />
                </th>
                <th className="px-3 py-3 font-medium">抬头信息</th>
                <th className="px-3 py-3 font-medium">税号 / 银行</th>
                <th className="px-3 py-3 font-medium">联系方式</th>
                <th className="px-3 py-3 font-medium">更新时间</th>
                <th className="px-3 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    暂无匹配的发票抬头
                    <Link href="/invoice-titles/new" className="ml-1 text-primary hover:underline">
                      立即新增
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30 ${
                      selected.has(item.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-3 py-3 align-top">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label="选择"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">
                              {item.company_name}
                            </span>
                            {item.title_type === 'own_company' && (
                              <Badge className="bg-primary text-primary-foreground">
                                本公司
                              </Badge>
                            )}
                            {item.title_type === 'partner' && (
                              <Badge className="bg-warning/15 text-warning">合作方</Badge>
                            )}
                            {item.is_default && (
                              <Badge variant="outline" className="gap-1 text-primary border-primary/40">
                                <Star className="h-3 w-3 fill-current" />
                                默认
                              </Badge>
                            )}
                          </div>
                          {item.company_name_en && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.company_name_en}
                            </p>
                          )}
                          {item.address && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {item.address}
                            </p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        {item.tax_id ? (
                          <button
                            type="button"
                            onClick={() => copyText(item.tax_id, '税号已复制')}
                            className="group flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-primary"
                            title={item.tax_id}
                          >
                            <span className="truncate max-w-[180px]">{item.tax_id}</span>
                            <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        ) : item.overseas_tax_id ? (
                          <button
                            type="button"
                            onClick={() => copyText(item.overseas_tax_id, '海外税号已复制')}
                            className="group flex items-center gap-1.5 font-mono text-xs text-warning hover:text-primary"
                            title={item.overseas_tax_id}
                          >
                            <span className="truncate max-w-[180px]">{item.overseas_tax_id}</span>
                            <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {item.bank_name && (
                          <p className="text-xs text-muted-foreground" title={item.bank_account ?? undefined}>
                            {item.bank_name} ·{' '}
                            <span className="font-mono">{maskBankAccount(item.bank_account)}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5 text-xs">
                        {item.contact_name && (
                          <p className="text-foreground">{item.contact_name}</p>
                        )}
                        {item.phone && <p className="text-muted-foreground">{item.phone}</p>}
                        {item.contact_email && (
                          <p className="truncate text-muted-foreground max-w-[180px]">
                            {item.contact_email}
                          </p>
                        )}
                        {!item.contact_name && !item.phone && !item.contact_email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.updated_at)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.title_type === 'own_company' && !item.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(item.id)}
                            className="h-8 px-2 text-muted-foreground"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                          <Link href={`/invoice-titles/${item.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 批量操作栏 */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              已选择 <span className="font-semibold">{selected.size}</span> 项
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                取消选择
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                批量删除
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        共 {filtered.length} 条记录 · 数据按组织隔离，仅本组织成员可见
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
