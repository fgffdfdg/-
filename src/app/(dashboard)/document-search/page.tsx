'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Download, Eye, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DocSearchResult, DocSearchResponse } from '@/lib/document-search/types';
import { DOC_TYPE_META } from '@/lib/document-search/types';

const PAGE_SIZE = 20;

export default function DocumentSearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [summary, setSummary] = useState<DocSearchResponse['summary'] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<DocSearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 搜索
  const search = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSummary(null);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: debouncedQuery, page: String(page), pageSize: String(PAGE_SIZE) });
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const res = await fetch(`/api/document-search?${params.toString()}`);
      const json: DocSearchResponse = await res.json();
      setResults(json.data);
      setSummary(json.summary);
      setTotal(json.total);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, selectedType, selectedStatus]);

  useEffect(() => {
    search();
  }, [search]);

  // 预览
  const handlePreview = async (item: DocSearchResult) => {
    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const res = await fetch(`/api/document-search/file-url?id=${item.id}&source=${item.source}`);
      const json = await res.json();
      if (json.url) setPreviewUrl(json.url);
    } catch {
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 下载
  const handleDownload = async (item: DocSearchResult) => {
    try {
      const res = await fetch(`/api/document-search/file-url?id=${item.id}&source=${item.source}&disposition=attachment`);
      const json = await res.json();
      if (json.url) {
        const a = document.createElement('a');
        a.href = json.url;
        a.download = json.fileName || 'document';
        a.click();
      }
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const typeChips: { value: string; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'contract-invoice-pl', label: '发票·合同·装箱单' },
    { value: 'export-license', label: '出口许可证' },
    { value: 'customs-declaration', label: '出口报关单' },
    { value: 'bl-document', label: '海运提单' },
  ];

  const statusChips: { value: string; label: string; color: string }[] = [
    { value: 'all', label: '全部状态', color: '' },
    { value: 'official', label: '正式', color: 'bg-green-100 text-green-700' },
    { value: 'draft', label: '草稿', color: 'bg-yellow-100 text-yellow-700' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 标题 */}
      <h1 className="text-2xl font-bold text-foreground mb-2">单证检索</h1>
      <p className="text-sm text-muted-foreground mb-6">
        输入合同号、发票号、装箱单号、车架号、许可证号、报关单号或提单号，快速检索对应单证
      </p>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入合同号 / 发票号 / 车架号 / 许可证号 / 报关单号 / 提单号..."
          className="w-full pl-12 pr-10 py-4 text-lg rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {typeChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => { setSelectedType(chip.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedType === chip.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 状态筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => { setSelectedStatus(chip.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedStatus === chip.value
                ? 'bg-primary text-primary-foreground'
                : chip.color || 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 统计 */}
      {summary && (
        <div className="text-sm text-muted-foreground mb-4">
          共找到 <span className="font-semibold text-foreground">{summary.totalCount}</span> 条结果
          （正式 <span className="text-green-600 font-medium">{summary.officialCount}</span> · 草稿 <span className="text-yellow-600 font-medium">{summary.draftCount}</span>）
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && debouncedQuery && results.length === 0 && (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">未找到匹配的单证，请尝试其他关键词</p>
        </div>
      )}

      {/* 结果列表 */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((item) => (
            <ResultCard
              key={`${item.source}-${item.id}`}
              item={item}
              onPreview={() => handlePreview(item)}
              onDownload={() => handleDownload(item)}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 预览弹窗 */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          previewUrl={previewUrl}
          loading={previewLoading}
          onClose={() => { setPreviewItem(null); setPreviewUrl(null); }}
          onDownload={() => handleDownload(previewItem)}
        />
      )}
    </div>
  );
}

// ─── 结果卡片 ───

function ResultCard({
  item,
  onPreview,
  onDownload,
}: {
  item: DocSearchResult;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const meta = DOC_TYPE_META[item.docType];
  const isPdf = item.fileMime === 'application/pdf' || item.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 类型 + 状态 */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
              {meta.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              item.status === 'official' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {item.statusLabel}
            </span>
          </div>

          {/* 单证编号 */}
          <div className="text-base font-semibold text-foreground mb-1">
            {item.docNo || item.title || '无编号'}
          </div>
          {item.title && item.docNo && (
            <div className="text-sm text-muted-foreground mb-1">{item.title}</div>
          )}

          {/* 关联编号 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {item.relatedNos.contractNo && <span>合同号: {item.relatedNos.contractNo}</span>}
            {item.relatedNos.invoiceNo && <span>发票号: {item.relatedNos.invoiceNo}</span>}
            {item.relatedNos.packingListNo && <span>装箱单号: {item.relatedNos.packingListNo}</span>}
            {item.relatedNos.licenseNo && <span>许可证号: {item.relatedNos.licenseNo}</span>}
            {item.relatedNos.customsNo && <span>报关单号: {item.relatedNos.customsNo}</span>}
            {item.relatedNos.blNo && <span>提单号: {item.relatedNos.blNo}</span>}
          </div>

          {/* VIN */}
          {item.vins && item.vins.length > 0 && (
            <div className="mt-1.5 text-xs text-muted-foreground font-mono">
              车架号: {item.vins.slice(0, 3).join(', ')}
              {item.vins.length > 3 && <span className="text-muted-foreground/60"> +{item.vins.length - 3}</span>}
            </div>
          )}

          {/* 时间 */}
          <div className="mt-1.5 text-xs text-muted-foreground/60">
            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('zh-CN') : ''} 更新
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          {item.hasFile && (
            <>
              <button
                onClick={onPreview}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">预览</span>
              </button>
              <button
                onClick={onDownload}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">下载</span>
              </button>
            </>
          )}
          {item.sourceRoute && (
            <a
              href={item.sourceRoute}
              className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            >
              查看详情
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 预览弹窗 ───

function PreviewModal({
  item,
  previewUrl,
  loading,
  onClose,
  onDownload,
}: {
  item: DocSearchResult;
  previewUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const isPdf = item.fileMime === 'application/pdf' || item.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = item.fileMime?.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="font-semibold text-foreground">{item.fileName || '预览'}</div>
            <div className="text-xs text-muted-foreground">{item.docNo}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> 下载
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !previewUrl && (
            <div className="text-center py-20 text-muted-foreground">无法加载预览</div>
          )}
          {!loading && previewUrl && isPdf && (
            <iframe
              src={previewUrl}
              className="w-full h-full min-h-[70vh]"
              title="PDF Preview"
            />
          )}
          {!loading && previewUrl && isImage && (
            <img
              src={previewUrl}
              alt={item.fileName || '预览'}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
          {!loading && previewUrl && !isPdf && !isImage && (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">此文件类型不支持在线预览</p>
              <button
                onClick={onDownload}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                下载文件
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}