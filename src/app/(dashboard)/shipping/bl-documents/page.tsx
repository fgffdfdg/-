'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Download, Eye, Trash2, Loader2, Ship, Calendar, Anchor, Container } from 'lucide-react';

interface BlDocument {
  id: string;
  blNo: string;
  vesselName: string | null;
  voyage: string | null;
  containerNumbers: string[];
  vins: string[];
  portOfLoading: string | null;
  portOfDischarge: string | null;
  shippingDate: string | null;
  estimatedArrivalDate: string | null;
  carrier: string | null;
  fileName: string | null;
  fileMime: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BlDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<BlDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/bl-documents?${params.toString()}`);
      const json = await res.json();
      setDocs(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此提单？')) return;
    try {
      const res = await fetch(`/api/bl-documents/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDocs();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await fetch(`/api/bl-documents/${id}/file-url`);
      const json = await res.json();
      if (json.url) window.open(json.url, '_blank');
    } catch (err) {
      console.error('预览失败:', err);
    }
  };

  const handleDownload = async (doc: BlDocument) => {
    try {
      const res = await fetch(`/api/bl-documents/${doc.id}/file-url`);
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">海运提单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理出口海运提单，上传并绑定车架号</p>
        </div>
        <button
          onClick={() => router.push('/shipping/bl-documents/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> 上传提单
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索提单号 / 船名 / 船次..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">暂无提单记录</p>
          <button
            onClick={() => router.push('/shipping/bl-documents/new')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            上传第一份提单
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-semibold text-foreground">{doc.blNo}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-sm">
                    {doc.vesselName && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Ship className="h-3.5 w-3.5" /> {doc.vesselName}
                      </div>
                    )}
                    {doc.voyage && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Anchor className="h-3.5 w-3.5" /> {doc.voyage}
                      </div>
                    )}
                    {doc.carrier && (
                      <div className="text-muted-foreground">{doc.carrier}</div>
                    )}
                    {doc.portOfLoading && (
                      <div className="text-muted-foreground">起运港: {doc.portOfLoading}</div>
                    )}
                    {doc.portOfDischarge && (
                      <div className="text-muted-foreground">卸货港: {doc.portOfDischarge}</div>
                    )}
                    {doc.shippingDate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> {doc.shippingDate}
                      </div>
                    )}
                  </div>

                  {doc.containerNumbers && doc.containerNumbers.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Container className="h-3.5 w-3.5" />
                      {doc.containerNumbers.slice(0, 3).join(', ')}
                      {doc.containerNumbers.length > 3 && ` +${doc.containerNumbers.length - 3}`}
                    </div>
                  )}

                  {doc.vins && doc.vins.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground font-mono">
                      车架号: {doc.vins.slice(0, 3).join(', ')}
                      {doc.vins.length > 3 && ` +${doc.vins.length - 3}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={() => handlePreview(doc.id)} className="p-2 rounded-lg border border-border hover:bg-muted" title="预览">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDownload(doc)} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90" title="下载">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="删除">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}