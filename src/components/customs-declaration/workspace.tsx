'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  CheckCircle,
  FileSignature,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import { DeclarationEditor } from '@/components/customs-declaration/declaration-editor';
import { EditorGuidePanel } from '@/components/customs-declaration/editor-guide-panel';
import CustomsDeclarationPreview from '@/components/customs-declaration/declaration-preview';
import { ConsignorPicker } from '@/components/customs-declaration/consignor-picker';
import { ConsigneePicker } from '@/components/customs-declaration/consignee-picker';
import { DeclaringEntityPicker } from '@/components/customs-declaration/declaring-entity-picker';
import type { CustomsDeclarationFull, DeclarationParty } from '@/lib/customs-declaration/types';
import {
  getDefaultDeclaration,
  validateDeclaration,
} from '@/lib/customs-declaration/types';
import {
  createCustomsDeclaration,
  getCustomsDeclaration,
  updateCustomsDeclaration,
} from '@/lib/customs-declaration/client';
import type { StampConfig } from '@/components/customs-declaration/stamp-overlay';

interface Props {
  mode: 'new' | 'edit';
  declarationId?: string;
}

export function CustomsDeclarationWorkspace({ mode, declarationId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'preview' ? 'preview' : 'edit';
  const shouldAutoPrint = searchParams.get('print') === '1';

  const { token } = useAuth();
  const { organization } = useOrg();
  const orgId = organization?.id ?? null;

  const [data, setData] = React.useState<CustomsDeclarationFull>(() => {
    if (mode === 'edit') return getDefaultDeclaration();
    const d = getDefaultDeclaration();
    return d;
  });
  const [loading, setLoading] = React.useState(mode === 'edit');
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState<'edit' | 'preview'>(initialTab);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [zoom, setZoom] = React.useState(0.85);
  const autoPrintTriggered = React.useRef(false);
  const [stampConfig, setStampConfig] = React.useState<StampConfig | null>(null);

  // 加载已有数据
  React.useEffect(() => {
    if (mode !== 'edit' || !declarationId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getCustomsDeclaration(token, declarationId);
        if (!mounted) return;
        const row = res.data as unknown as { data: CustomsDeclarationFull; status?: string };
        const loaded = { ...getDefaultDeclaration(), ...row.data, id: declarationId };
        if (row.status) loaded.status = row.status as CustomsDeclarationFull['status'];
        setData(loaded);
        // 恢复印章配置
        if (loaded.stampDataUrl) {
          setStampConfig({
            dataUrl: loaded.stampDataUrl,
            x: loaded.stampX ?? 48,
            y: loaded.stampY ?? 0,
            width: loaded.stampWidth ?? 148,
            height: loaded.stampHeight ?? 148,
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载失败');
        router.replace('/customs-declaration');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mode, declarationId, token, router]);

  // 从列表页「导出 PDF」跳转时自动触发打印
  React.useEffect(() => {
    if (!shouldAutoPrint || loading || autoPrintTriggered.current) return;
    autoPrintTriggered.current = true;
    setTab('preview');
    // 等预览渲染完成后触发打印
    setTimeout(() => triggerPrint(), 600);
  }, [shouldAutoPrint, loading]);

  const handleSave = React.useCallback(
    async (opts?: { thenPreview?: boolean }) => {
      // 先做必填校验
      const issues = validateDeclaration(data);
      if (issues.length > 0) {
        // 草稿允许保存但要提示
        if (opts?.thenPreview) {
          toast.error(`还有 ${issues.length} 项必填待完善，最前：${issues[0].message}`);
          return;
        } else {
          toast.warning(`已保存草稿，仍有 ${issues.length} 项必填待完善`);
        }
      }
      setSaving(true);
      try {
        const payload = {
          data: {
            ...data,
            declaringEntity: data.declaringEntity || data.consignor.name,
            stampDataUrl: stampConfig?.dataUrl ?? undefined,
            stampX: stampConfig?.x,
            stampY: stampConfig?.y,
            stampWidth: stampConfig?.width,
            stampHeight: stampConfig?.height,
          },
          organization_id: orgId,
        };
        if (mode === 'new' || !data.id) {
          // 新建：entryNo 由服务端按当天流水生成，传 'auto' 显式触发
          const toSave = { ...payload.data, entryNo: 'auto' };
          const res = await createCustomsDeclaration(token, {
            data: toSave,
            organization_id: orgId,
          });
          const created = res.data as { id: string; entry_no?: string; data?: CustomsDeclarationFull };
          const newId = created.id;
          const assignedEntryNo = created.data?.entryNo || created.entry_no || '';
          setData((d) => ({ ...d, id: newId, entryNo: assignedEntryNo }));
          setLastSavedAt(new Date());
          toast.success(assignedEntryNo ? `已保存（编号 ${assignedEntryNo}）` : '已保存');
          if (opts?.thenPreview) {
            router.replace(`/customs-declaration/${newId}?tab=preview`);
            setTab('preview');
          } else {
            router.replace(`/customs-declaration/${newId}`);
          }
        } else {
          await updateCustomsDeclaration(token, data.id, { data: payload.data });
          setLastSavedAt(new Date());
          toast.success('已保存');
          if (opts?.thenPreview) {
            setTab('preview');
            router.replace(`/customs-declaration/${data.id}?tab=preview`);
          }
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '保存失败');
      } finally {
        setSaving(false);
      }
    },
    [data, mode, orgId, router, token, stampConfig],
  );

  const handlePickConsignor = (p: DeclarationParty) => {
    setData((d) => ({
      ...d,
      consignor: { ...d.consignor, ...p },
      declaringEntity: d.declaringEntity || p.name,
    }));
    toast.success('已回填境内发货人');
  };
  const handlePickConsignee = (p: DeclarationParty) => {
    setData((d) => ({ ...d, consignee: { ...d.consignee, ...p } }));
    toast.success('已回填境外收货人');
  };

  const triggerPrint = () => {
    if (typeof window === 'undefined') return;
    const frame = document.querySelector('.customs-print-frame') as HTMLElement | null;
    if (!frame) {
      window.print();
      return;
    }
    // 记录原始位置，打印后还原
    const originalParent = frame.parentNode as HTMLElement;
    const placeholder = document.createComment('customs-print-placeholder');
    originalParent.insertBefore(placeholder, frame);

    let slot = document.getElementById('customs-print-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'customs-print-slot';
      document.body.appendChild(slot);
    }
    slot.appendChild(frame);
    document.body.classList.add('customs-printing');

    const cleanup = () => {
      document.body.classList.remove('customs-printing');
      try {
        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(frame, placeholder);
          placeholder.parentNode.removeChild(placeholder);
        }
        if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
      } catch {
        /* noop */
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // 等两帧 DOM 稳定后再弹打印对话框
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const handlePrint = () => triggerPrint();

  const handleDownloadPdf = () => {
    toast.message('请在打印对话框中选择"另存为 PDF"');
    setTimeout(() => triggerPrint(), 200);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24 text-on-surface-variant">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        正在加载报关单…
      </div>
    );
  }

  return (
    <div className="print-workspace-root min-h-0 flex flex-col">
      {/* 顶部操作条 */}
      <div className="customs-no-print sticky top-0 z-30 bg-surface border-b border-outline-variant/30 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/customs-declaration"
            className="w-8 h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            title="返回列表"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-primary" />
            {mode === 'new' ? '新建报关单' : `报关单 ${data.entryNo}`}
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-surface-container-high text-on-surface-variant">
            {data.status === 'draft' ? '草稿' : data.status === 'submitted' ? '待申报' : '已归档'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-container rounded-md p-0.5 mr-1">
            <button
              type="button"
              onClick={() => setTab('edit')}
              className={`px-3 h-7 rounded text-xs font-medium transition-colors ${
                tab === 'edit' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`px-3 h-7 rounded text-xs font-medium transition-colors ${
                tab === 'preview' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              预览
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            保存草稿
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white" onClick={() => handleSave({ thenPreview: true })} disabled={saving}>
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            保存并预览
          </Button>
        </div>
      </div>

      {/* 内容区 */}
      {tab === 'edit' ? (
        <div className="flex gap-5 p-5 items-start flex-1 min-w-0 overflow-y-auto">
          <div className="flex-1 min-w-0">
            <DeclarationEditor
              value={data}
              onChange={setData}
              onAutoFill={(_patch, goods) => {
                if (goods && goods.length > 0) {
                  setData((prev) => ({ ...prev, goods }));
                }
              }}
              onPickConsignor={() => {
                // ConsignorPicker 渲染在下方，通过 ref 触发较复杂，此处直接在编辑器内部按钮打开
              }}
              onPickConsignee={() => {
                // 同上
              }}
              consignorPickerSlot={
                <ConsignorPicker token={token} orgId={orgId} onPick={handlePickConsignor} />
              }
              consigneePickerSlot={
                <ConsigneePicker token={token} orgId={orgId} onPick={handlePickConsignee} />
              }
              declaringEntityPickerSlot={
                <DeclaringEntityPicker
                  token={token}
                  orgId={orgId}
                  consignorName={data.consignor.name}
                  onPick={(name) => setData((prev) => ({ ...prev, declaringEntity: name }))}
                />
              }
            />
          </div>
          <EditorGuidePanel value={data} lastSavedAt={lastSavedAt} />
        </div>
      ) : (
        <div className="print-scroll-wrap flex-1 min-w-0 overflow-y-auto bg-background">
          {/* 预览工具栏 */}
          <div className="customs-no-print sticky top-[57px] z-20 bg-surface/90 backdrop-blur border-b border-outline-variant/30 px-6 py-2.5 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Eye className="w-3.5 h-3.5" />
              <span>A4 横向预览</span>
              <span className="w-px h-3 bg-outline-variant mx-1" />
              <span className="font-mono">{data.entryNo}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                下载 PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                打印
              </Button>
              <div className="flex items-center ml-2 border border-outline-variant/60 rounded-md overflow-hidden bg-surface">
                <button
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-container text-on-surface border-r border-outline-variant/60"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  aria-label="缩小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-[12px] font-medium text-on-surface tabular-nums min-w-[48px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-container text-on-surface border-l border-outline-variant/60"
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                  aria-label="放大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/8 text-primary text-[12px] font-medium border border-primary/15">
                A4 横向
              </span>
            </div>
          </div>

          <div className="py-4 flex justify-center print:p-0 print:block">
            <div
              style={{ width: `${1120 * zoom}px` }}
              className="print:w-full"
            >
              <div
                className="customs-print-frame"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: '1120px',
                  marginBottom: `${792 * (zoom - 1)}px`,
                }}
              >
                <CustomsDeclarationPreview data={data} stampConfig={stampConfig} onStampChange={setStampConfig} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
