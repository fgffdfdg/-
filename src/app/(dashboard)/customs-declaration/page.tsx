'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FileSignature,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import {
  listCustomsDeclarations,
  deleteCustomsDeclaration,
  type CustomsDeclarationListItem,
} from '@/lib/customs-declaration/client';

const STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'submitted', label: '待申报' },
  { value: 'archived', label: '已归档' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  submitted: '待申报',
  archived: '已归档',
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  submitted: 'bg-accent-container text-accent',
  archived: 'bg-surface-container text-on-surface-variant',
};

export default function CustomsDeclarationListPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { organization } = useOrg();

  const [items, setItems] = React.useState<CustomsDeclarationListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const [status, setStatus] = React.useState<'all' | 'draft' | 'submitted' | 'archived'>('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [jumpPage, setJumpPage] = React.useState('');
  const pageSize = 12;

  const [deleteTarget, setDeleteTarget] = React.useState<CustomsDeclarationListItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // 搜索防抖 300ms
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCustomsDeclarations(token, {
        q: debouncedQ,
        status,
        dateFrom,
        dateTo,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        organizationId: organization?.id ?? null,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token, debouncedQ, status, dateFrom, dateTo, page, organization?.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  // 状态切换时重置页码
  const handleStatusChange = (v: 'all' | 'draft' | 'submitted' | 'archived') => {
    setStatus(v);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomsDeclaration(token, deleteTarget.id);
      toast.success('已删除');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPdf = (it: CustomsDeclarationListItem) => {
    // 打开预览页，在新标签页中触发打印
    const url = `/customs-declaration/${it.id}?tab=preview&print=1`;
    window.open(url, '_blank');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const handleJumpPage = () => {
    const num = parseInt(jumpPage, 10);
    if (isNaN(num) || num < 1) {
      setPage(1);
      setJumpPage('');
    } else if (num > totalPages) {
      setPage(totalPages);
      setJumpPage('');
    } else {
      setPage(num);
      setJumpPage('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 顶部标题 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary" />
            出口报关单预录
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            按海关出口货物报关单版式录入字段，导出 A4 横向 PDF 供单一窗口核对
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/customs-declaration/bookmarks">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              单一窗口入口
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-white">
            <Link href="/customs-declaration/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              新建报关单
            </Link>
          </Button>
        </div>
      </div>

      {/* 状态快捷切换标签 */}
      <div className="flex items-center gap-1 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleStatusChange(tab.value)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              status === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选条 */}
      <div className="bg-surface rounded-lg shadow-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索录入编号 / 海关编号 / 合同号 / 收货人"
            className="pl-9 h-9 bg-surface-container border-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span>出口日期</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 bg-surface-container border-none"
          />
          <span>至</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 bg-surface-container border-none"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-surface rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container/60 border-b border-outline-variant/30">
              <tr className="text-left text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">录入编号 / 海关编号</th>
                <th className="px-4 py-3 font-semibold">收货人 / 合同号</th>
                <th className="px-4 py-3 font-semibold">关别 / 运输</th>
                <th className="px-4 py-3 font-semibold">贸易国 → 运抵国</th>
                <th className="px-4 py-3 font-semibold text-right">项数 / 金额</th>
                <th className="px-4 py-3 font-semibold">出口日期</th>
                <th className="px-4 py-3 font-semibold">状态</th>
                <th className="px-4 py-3 font-semibold text-right pr-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-on-surface-variant text-sm">
                    加载中…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                        <FileSignature className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-on-surface">还没有报关单</div>
                        <div className="text-xs text-on-surface-variant mt-1">
                          点击右上角"新建报关单"开始预录
                        </div>
                      </div>
                      <Button asChild size="sm" className="mt-2 bg-accent hover:bg-accent/90 text-white">
                        <Link href="/customs-declaration/new">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          新建报关单
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={it.id}
                    onClick={(e) => {
                      // 点击操作按钮时不跳转
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('a') || target.closest('[role="menuitem"]')) return;
                      router.push(`/customs-declaration/${it.id}`);
                    }}
                    className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors cursor-pointer"
                    title="点击进入编辑"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 group/entry">
                        <span className="font-mono text-[13px] font-medium text-on-surface">{it.entryNo}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(it.entryNo, `entry-${it.id}`);
                          }}
                          className="opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                          title="复制录入编号"
                        >
                          {copiedId === `entry-${it.id}` ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 group/customs mt-0.5">
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          {it.customsNo || '海关编号待回填'}
                        </span>
                        {it.customsNo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(it.customsNo!, `customs-${it.id}`);
                            }}
                            className="opacity-0 group/customs:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                            title="复制海关编号"
                          >
                            {copiedId === `customs-${it.id}` ? (
                              <Check className="w-2.5 h-2.5 text-success" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-on-surface truncate max-w-[200px]">
                        {it.consigneeName || '—'}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                        {it.contractNo || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-on-surface">{it.exitCustomsName || '—'}</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        {it.transportModeName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-on-surface">
                      {it.tradeCountryName || it.tradeCountryCode || '—'}
                      <span className="text-on-surface-variant mx-1.5">→</span>
                      {it.arrivalCountryName || it.arrivalCountryCode || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-[13px] font-medium text-on-surface tabular-nums">
                        {it.itemCount} 项 · {it.totalQuantity}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                        {it.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {it.currencyCode || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-on-surface tabular-nums">
                      {it.exportDate || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`font-normal text-[11px] ${STATUS_CLASS[it.status] || ''}`}
                      >
                        {STATUS_LABEL[it.status] || it.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right pr-4">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          asChild
                        >
                          <Link href={`/customs-declaration/${it.id}`}>
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            编辑
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/customs-declaration/${it.id}?tab=preview`)}>
                              <Eye className="w-3.5 h-3.5 mr-2" />
                              预览 PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportPdf(it)}>
                              <Download className="w-3.5 h-3.5 mr-2" />
                              导出 PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-error focus:text-error"
                              onClick={() => setDeleteTarget(it)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
            <div>
              共 <b className="text-on-surface">{total}</b> 条 · 第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {/* 页码列表 */}
              {(() => {
                const pages: number[] = [];
                const start = Math.max(1, page - 2);
                const end = Math.min(totalPages, page + 2);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>

              {/* 页码跳转 */}
              <div className="flex items-center gap-1 ml-2">
                <span className="text-on-surface-variant">跳至</span>
                <Input
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJumpPage();
                  }}
                  placeholder={`${page}`}
                  className="w-12 h-7 text-center bg-surface-container border-none text-xs"
                />
                <button
                  type="button"
                  onClick={handleJumpPage}
                  className="inline-flex items-center gap-0.5 px-1.5 h-7 rounded text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除报关单</DialogTitle>
            <DialogDescription>
              确定要删除报关单 <span className="font-mono text-on-surface">{deleteTarget?.entryNo}</span> 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}