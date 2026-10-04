'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Plus, Search, Loader2, FileText } from 'lucide-react';

interface VehicleRecord {
  id: string;
  vin: string;
  make?: string;
  model?: string;
  year?: string | number;
}

export default function NewBlDocumentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    blNo: '',
    vesselName: '',
    voyage: '',
    containerNumbers: [] as string[],
    vins: [] as string[],
    portOfLoading: '',
    portOfDischarge: '',
    shippingDate: '',
    estimatedArrivalDate: '',
    carrier: '',
    note: '',
  });
  const [containerInput, setContainerInput] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // VIN搜索
  const [vinQuery, setVinQuery] = useState('');
  const [vehicleResults, setVehicleResults] = useState<VehicleRecord[]>([]);
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
    if (!form.vins.includes(vin)) {
      setForm((f) => ({ ...f, vins: [...f.vins, vin] }));
    }
    setVinQuery('');
    setVehicleResults([]);
  };

  const removeVin = (vin: string) => {
    setForm((f) => ({ ...f, vins: f.vins.filter((v) => v !== vin) }));
  };

  const addContainer = () => {
    const trimmed = containerInput.trim();
    if (trimmed && !form.containerNumbers.includes(trimmed)) {
      setForm((f) => ({ ...f, containerNumbers: [...f.containerNumbers, trimmed] }));
    }
    setContainerInput('');
  };

  const removeContainer = (cn: string) => {
    setForm((f) => ({ ...f, containerNumbers: f.containerNumbers.filter((c) => c !== cn) }));
  };

  const handleSubmit = async () => {
    if (!form.blNo.trim()) { setError('请输入提单号'); return; }
    if (!file) { setError('请选择提单文件'); return; }
    setSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('blNo', form.blNo.trim());
      fd.append('vesselName', form.vesselName.trim());
      fd.append('voyage', form.voyage.trim());
      fd.append('containerNumbers', JSON.stringify(form.containerNumbers));
      fd.append('vins', JSON.stringify(form.vins));
      fd.append('portOfLoading', form.portOfLoading.trim());
      fd.append('portOfDischarge', form.portOfDischarge.trim());
      fd.append('shippingDate', form.shippingDate);
      fd.append('estimatedArrivalDate', form.estimatedArrivalDate);
      fd.append('carrier', form.carrier.trim());
      if (form.note) fd.append('note', form.note.trim());

      const res = await fetch('/api/bl-documents', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '上传失败');
      }
      router.push('/shipping/bl-documents');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6">上传海运提单</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-5">
        {/* 提单号 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">提单号 (B/L No.) <span className="text-destructive">*</span></label>
          <input
            type="text"
            value={form.blNo}
            onChange={(e) => updateField('blNo', e.target.value)}
            placeholder="如: COSU1234567890"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 船名 + 船次 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">船名</label>
            <input
              type="text"
              value={form.vesselName}
              onChange={(e) => updateField('vesselName', e.target.value)}
              placeholder="如: COSCO SHIPPING ARIES"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">船次</label>
            <input
              type="text"
              value={form.voyage}
              onChange={(e) => updateField('voyage', e.target.value)}
              placeholder="如: V.025E"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* 承运人 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">承运人</label>
          <input
            type="text"
            value={form.carrier}
            onChange={(e) => updateField('carrier', e.target.value)}
            placeholder="如: COSCO SHIPPING LINES"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 集装箱号 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">集装箱号</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={containerInput}
              onChange={(e) => setContainerInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addContainer(); } }}
              placeholder="如: TCLU1234567"
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={addContainer}
              className="px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {form.containerNumbers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.containerNumbers.map((cn) => (
                <span key={cn} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm text-foreground">
                  {cn}
                  <button onClick={() => removeContainer(cn)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 起运港 + 卸货港 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">起运港</label>
            <input
              type="text"
              value={form.portOfLoading}
              onChange={(e) => updateField('portOfLoading', e.target.value)}
              placeholder="如: 上海港"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">卸货港</label>
            <input
              type="text"
              value={form.portOfDischarge}
              onChange={(e) => updateField('portOfDischarge', e.target.value)}
              placeholder="如: 迪拜港"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* 日期 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">装船日期</label>
            <input
              type="date"
              value={form.shippingDate}
              onChange={(e) => updateField('shippingDate', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">预计到港日期</label>
            <input
              type="date"
              value={form.estimatedArrivalDate}
              onChange={(e) => updateField('estimatedArrivalDate', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
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
          {/* 搜索结果 */}
          {vehicleResults.length > 0 && (
            <div className="mt-1 border border-border rounded-lg bg-card shadow-lg max-h-48 overflow-y-auto">
              {vehicleResults.map((v) => (
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
          {/* 已选VIN */}
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

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">备注</label>
          <textarea
            value={form.note}
            onChange={(e) => updateField('note', e.target.value)}
            rows={2}
            placeholder="可选备注信息"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* 文件上传 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">提单文件 <span className="text-destructive">*</span></label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-foreground font-medium">{file.name}</span>
                <span className="text-muted-foreground text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">点击选择 PDF 或图片文件</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              className="hidden"
            />
          </div>
        </div>

        {/* 提交 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> 上传中...</span>
          ) : '上传提单'}
        </button>
      </div>
    </div>
  );
}