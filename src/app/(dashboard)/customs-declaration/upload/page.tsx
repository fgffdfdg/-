'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Plus, Search, Loader2, FileText, Download, Eye, Trash2 } from 'lucide-react';

interface CustomsFile {
  id: string;
  entryNo: string;
  customsNo: string | null;
  contractNo: string | null;
  vins: string[];
  fileName: string;
  fileMime: string;
  issueDate: string | null;
  createdAt: string;
}

export default function CustomsDeclarationFilesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'upload'>('list');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">出口报关单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">上传正式报关单扫描件，录入报关单号并绑定车架号</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'list' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
            }`}
          >
            已上传列表
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'upload' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-1" /> 上传报关单
          </button>
        </div>
      </div>

      {tab === 'list' ? <CustomsFilesList /> : <CustomsFileUploadForm onSuccess={() => { setTab('list'); router.refresh(); }} />}
    </div>
  );
}

// ─── 列表 ───

function CustomsFilesList() {
  const [docs, setDocs] = useState<CustomsFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/customs-declaration-files?${params.toString()}`);
      const json = await res.json();
      setDocs(json.data || []);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此报关单？')) return;
    try {
      const res = await fetch(`/api/customs-declaration-files/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDocs();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await fetch(`/api/customs-declaration-files/${id}/file-url`);
      const json = await res.json();
      if (json.url) window.open(json.url, '_blank');
    } catch (err) {
      console.error('预览失败:', err);
    }
  };

  const handleDownload = async (doc: CustomsFile) => {
    try {
      const res = await fetch(`/api/customs-declaration-files/${doc.id}/file-url`);
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
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索报关单号 / 海关编号..."
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
          <p className="text-muted-foreground">暂无正式报关单记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">正式</span>
                    <span className="text-lg font-semibold text-foreground">{doc.entryNo}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {doc.customsNo && <span>海关编号: {doc.customsNo}</span>}
                    {doc.contractNo && <span>合同号: {doc.contractNo}</span>}
                    {doc.issueDate && <span>签发日期: {doc.issueDate}</span>}
                  </div>
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

// ─── 上传表单 ───

function CustomsFileUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    entryNo: '',
    customsNo: '',
    contractNo: '',
    vins: [] as string[],
    issueDate: '',
    note: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // VIN搜索
  const [vinQuery, setVinQuery] = useState('');
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [vinSearching, setVinSearching] = useState(false);

  const searchVin = useCallback(async () => {
    if (vinQuery.trim().length < 3) { setVehicleResults([]); return; }
    setVinSearching(true);
    try {
      const res = await fetch(`/api/vehicles?search=${encodeURIComponent(vinQuery)}&limit=10`);
      const json = await res.json();
      setVehicleResults(json.data || []);
    } catch {
      setVehicleResults([]);
    } finally {
      setVinSearching(false);
    }
  }, [vinQuery]);

  useEffect(() => {
    const timer = setTimeout(searchVin, 300);
    return () => clearTimeout(timer);
  }, [vinQuery, searchVin]);

  const addVin = (vin: string) => {
    if (!form.vins.includes(vin)) setForm((f) => ({ ...f, vins: [...f.vins, vin] }));
    setVinQuery('');
    setVehicleResults([]);
  };

  const removeVin = (vin: string) => {
    setForm((f) => ({ ...f, vins: f.vins.filter((v) => v !== vin) }));
  };

  const handleSubmit = async () => {
    if (!form.entryNo.trim()) { setError('请输入报关单号'); return; }
    if (!file) { setError('请选择报关单文件'); return; }
    setSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entryNo', form.entryNo.trim());
      if (form.customsNo) fd.append('customsNo', form.customsNo.trim());
      if (form.contractNo) fd.append('contractNo', form.contractNo.trim());
      fd.append('vins', JSON.stringify(form.vins));
      if (form.issueDate) fd.append('issueDate', form.issueDate);
      if (form.note) fd.append('note', form.note.trim());

      const res = await fetch('/api/customs-declaration-files', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '上传失败');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">报关单号 (Entry No.) <span className="text-destructive">*</span></label>
          <input
            type="text"
            value={form.entryNo}
            onChange={(e) => setForm((f) => ({ ...f, entryNo: e.target.value }))}
            placeholder="如: 220120250000123456"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">海关编号</label>
            <input
              type="text"
              value={form.customsNo}
              onChange={(e) => setForm((f) => ({ ...f, customsNo: e.target.value }))}
              placeholder="如: 020120250000123456"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">关联合同号</label>
            <input
              type="text"
              value={form.contractNo}
              onChange={(e) => setForm((f) => ({ ...f, contractNo: e.target.value }))}
              placeholder="如: TD-2025-00123"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">签发日期</label>
          <input
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* VIN检索绑定 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">绑定车架号 (VIN)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={vinQuery}
              onChange={(e) => setVinQuery(e.target.value)}
              placeholder="搜索车架号以绑定..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {vinSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {vehicleResults.length > 0 && (
            <div className="mt-1 border border-border rounded-lg bg-card shadow-lg max-h-48 overflow-y-auto">
              {vehicleResults.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => addVin(v.vin)}
                  disabled={form.vins.includes(v.vin)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="font-mono font-medium">{v.vin}</span>
                  {v.make && <span className="text-muted-foreground ml-2">{v.make} {v.model} {v.year}</span>}
                </button>
              ))}
            </div>
          )}
          {form.vins.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.vins.map((vin) => (
                <span key={vin} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-sm font-mono text-foreground">
                  {vin}
                  <button onClick={() => removeVin(vin)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">备注</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            rows={2}
            placeholder="可选备注信息"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* 文件上传 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">报关单文件 <span className="text-destructive">*</span></label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-foreground font-medium">{file.name}</span>
                <span className="text-muted-foreground text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">点击选择 PDF 或图片文件</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} className="hidden" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> 上传中...</span>
          ) : '上传报关单'}
        </button>
      </div>
    </div>
  );
}