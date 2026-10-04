'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  Download,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  ScanLine,
  Loader2,
  Search,
  FileEdit,
  Copy,
  Globe,
  ChevronDown,
  Link2,
  Check,
  ChevronsUpDown,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import type {
  ExportLicenseData,
  ExportLicenseMainData,
  ExportLicenseItem,
} from '@/components/documents/types';
import {
  getDefaultExportLicense,
  getDefaultExportLicenseMain,
  newLicenseItem,
} from '@/components/documents/types';
import { exportMultiToPDF } from '@/components/documents/pdf-export';
import LicensePartyPicker from '@/components/documents/license-party-picker';
import LicenseSnippetPicker from '@/components/documents/license-snippet-picker';
import { cn } from '@/lib/utils';
import {
  listDrafts,
  saveDraft,
  deleteDraft,
  recallLastMain,
  recallLastAnnex,
  rememberLastForm,
  listGoodsProfiles,
  saveGoodsProfile,
  touchGoodsProfile,
  deleteGoodsProfile,
  listOwnerProfiles,
  saveOwnerProfile,
  touchOwnerProfile,
  deleteOwnerProfile,
  hasLocalDrafts,
  getLocalDrafts,
  markDraftsSynced,
  clearLocalDrafts,
  cloudToLocalDraft,
  type LicenseDraft,
} from '@/lib/export-license/storage';
import {
  listLicenseDrafts,
  createLicenseDraft,
  updateLicenseDraft,
  deleteLicenseDraft,
  migrateLocalDrafts,
  type CloudLicenseDraft,
} from '@/lib/export-license/draft-api-client';
import { useAuth } from '@/lib/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useVinAutoFill } from '@/lib/vehicle-linkage/use-vin-autofill';

const ExportLicenseMainPreview = dynamic(
  () => import('@/components/documents/export-license-main-preview'),
  { loading: () => <div className="h-96 bg-muted animate-pulse rounded" /> },
);
const ExportLicensePreview = dynamic(
  () =>
    import('@/components/documents/export-license-preview').then(
      (m) => m.ExportLicensePreview,
    ),
  { loading: () => <div className="h-96 bg-muted animate-pulse rounded" /> },
);

// ─── 草单列表字段提取（兼容老数据：优先用冗余字段，没有则从 main/annex 现取） ───

function readMain(d: LicenseDraft): Partial<ExportLicenseMainData> {
  return (d.main as Partial<ExportLicenseMainData>) ?? {};
}

function readAnnex(d: LicenseDraft): Partial<ExportLicenseData> {
  return (d.annex as Partial<ExportLicenseData>) ?? {};
}

function getDraftContractNo(d: LicenseDraft): string {
  return d.contractNo || readMain(d).contractNo || '';
}

function getDraftVins(d: LicenseDraft): string[] {
  if (d.vins && d.vins.length > 0) return d.vins;
  const vin = readAnnex(d).vin?.trim();
  return vin ? [vin] : [];
}

function getDraftBrand(d: LicenseDraft): string {
  if (d.brand) return d.brand;
  const a = readAnnex(d);
  return a.brandCn || a.brandEn || '';
}

function getDraftModel(d: LicenseDraft): string {
  if (d.model) return d.model;
  const a = readAnnex(d);
  return a.modelCn || a.modelEn || '';
}

// 出口许可证明细行可选用的计价币种（15/16 栏）
const LICENSE_CURRENCIES: { value: string; label: string }[] = [
  { value: 'CNY', label: 'CNY 人民币' },
  { value: 'USD', label: 'USD 美元' },
  { value: 'EUR', label: 'EUR 欧元' },
  { value: 'GBP', label: 'GBP 英镑' },
  { value: 'JPY', label: 'JPY 日元' },
  { value: 'HKD', label: 'HKD 港币' },
  { value: 'CHF', label: 'CHF 瑞士法郎' },
  { value: 'AED', label: 'AED 迪拉姆' },
];

export default function LicenseDraftPage() {
  const { token } = useAuth();
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [drafts, setDrafts] = useState<LicenseDraft[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // ─── 合同号搜索联动 ───
  const [contractSearchOpen, setContractSearchOpen] = useState(false);
  const [contractSearchLoading, setContractSearchLoading] = useState(false);
  const [contractSearchResults, setContractSearchResults] = useState<
    { id: string; invoice_no: string; currency: string; vehicleCount: number; vehicles: Record<string, unknown>[] }[]
  >([]);

  // ─── VIN 自动填充 ───
  const { lookupByVin: lookupVinForAnnex, isLoading: vinLookupLoading } = useVinAutoFill('export-license');

  // ─── 主证 / 附加表编辑数据 ───
  // 新建草单时自动带入上一次编辑的内容（仅浏览器本地记忆，方便用户"在历史基础上改"）
  const [main, setMain] = useState<ExportLicenseMainData>(() => {
    if (typeof window === 'undefined') return getDefaultExportLicenseMain();
    const last = recallLastMain<ExportLicenseMainData>();
    return { ...getDefaultExportLicenseMain(), ...(last ?? {}) };
  });
  const [annex, setAnnex] = useState<ExportLicenseData>(() => {
    if (typeof window === 'undefined') return getDefaultExportLicense();
    const last = recallLastAnnex<ExportLicenseData>();
    return { ...getDefaultExportLicense(), ...(last ?? {}) };
  });

  // ─── 共享字段自动同步：主证 → 附加表 ───
  // 许可证号 / 发证日期 / 备注始终跟主证走；车主信息在 ownerDifferent=false 时跟出口商走
  useEffect(() => {
    setAnnex((prev) => {
      const next: ExportLicenseData = {
        ...prev,
        licenseNo: main.exportLicenseNo,
        issueDate: main.licenceDate,
      };
      if (!prev.ownerDifferent) {
        next.ownerNameCn = main.exporterName;
        next.ownerNameEn = prev.ownerNameEn || main.exporterName;
      }
      return next;
    });
  }, [main.exportLicenseNo, main.licenceDate, main.exporterName]);

  // ─── 合同号搜索（从交易草单中提取合同号）────────────────────────
  const [allDraftContracts, setAllDraftContracts] = useState<Array<{
    id: string;
    contractNo: string;
    invoiceNo: string;
    vehicles: Record<string, unknown>[];
  }>>([]);

  const searchContracts = useCallback(async (q: string) => {
    if (!token) {
      setContractSearchResults([]);
      return;
    }
    setContractSearchLoading(true);
    try {
      // 首次加载时从草单 API 获取全部合同草单
      let contracts = allDraftContracts;
      if (contracts.length === 0) {
        const res = await fetch(
          `/api/trade-documents?limit=30`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) { setContractSearchResults([]); return; }
        const json = await res.json();
        contracts = (json.data ?? [])
          .map((d: Record<string, unknown>) => {
            const docData = (d.doc_data as Record<string, unknown>) ?? {};
            const tradeInfo = (docData.tradeInfo as Record<string, unknown>) ?? {};
            const contractNo = (tradeInfo.contractNo as string) ?? '';
            const invoiceNo = (tradeInfo.invoiceNo as string) ?? '';
            const vehicles = (docData.vehicles as Record<string, unknown>[]) ?? [];
            return { id: d.id as string, contractNo, invoiceNo, vehicles };
          })
          .filter((c: { contractNo: string }) => c.contractNo);
        setAllDraftContracts(contracts);
      }

      // 客户端过滤
      const query = q.trim().toLowerCase();
      const filtered = query
        ? contracts.filter(
            (c) =>
              c.contractNo.toLowerCase().includes(query) ||
              c.invoiceNo.toLowerCase().includes(query),
          )
        : contracts;
      const items = filtered.map((c) => ({
        id: c.id,
        invoice_no: c.contractNo,
        currency: 'USD',
        vehicleCount: c.vehicles.length,
        vehicles: c.vehicles,
      }));
      setContractSearchResults(items);
    } catch {
      setContractSearchResults([]);
    } finally {
      setContractSearchLoading(false);
    }
  }, [token, allDraftContracts]);

  // 打开合同号搜索弹窗时默认加载全部合同草单
  useEffect(() => {
    if (contractSearchOpen && token) {
      searchContracts('');
    }
  }, [contractSearchOpen, token, searchContracts]);

  // ─── 选中合同：带入合同号 + 车辆信息 + 触发 VIN 档案查询 ────────
  const handleContractSelect = useCallback(async (item: {
    id: string;
    invoice_no: string;
    currency: string;
    vehicles: Record<string, unknown>[];
  }) => {
    // 1. 填入合同号
    setMain((prev) => ({ ...prev, contractNo: item.invoice_no }));

    // 2. 提取车辆信息到许可证明细行
    if (item.vehicles.length > 0) {
      const newItems: ExportLicenseItem[] = item.vehicles.map((v) => {
        const qty = Number(v.qty) || 1;
        const price = parseFloat(String(v.price ?? '0')) || 0;
        return {
          ...newLicenseItem(),
          specification: [v.brand, v.model].filter(Boolean).join(' ') || '-',
          unit: '辆',
          quantity: qty,
          currency: item.currency || 'USD',
          unitPriceUsd: price,
          amountUsd: qty * price,
          amountInUsd: item.currency === 'USD' ? qty * price : 0,
        };
      });
      setMain((prev) => ({ ...prev, items: newItems }));

      // 3. 取第一辆车的 VIN 填入附加表
      const firstVin = String(item.vehicles[0].vin ?? '');
      if (firstVin) {
        setAnnex((prev) => ({ ...prev, vin: firstVin.toUpperCase() }));

        // 4. 通过 VIN 索引车辆档案，自动填入附加表中文字段
        if (token) {
          const result = await lookupVinForAnnex(firstVin);
          if (result?._fromArchive) {
            setAnnex((prev) => ({ ...prev, ...result }));
            toast.success(`已从车辆档案自动填入 ${firstVin} 的识别信息`);
          }
        }
      }
    }

    setContractSearchOpen(false);
    toast.success(`已从合同 ${item.invoice_no} 带入 ${item.vehicles.length} 辆车`);
  }, [token, lookupVinForAnnex]);

  const [zoom, setZoom] = useState(0.7);
  const [exporting, setExporting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshDrafts = useCallback(async () => {
    // 先从 localStorage 快速渲染
    const local = listDrafts();
    setDrafts(local);

    // 如果已登录，从云端拉取
    if (token) {
      try {
        setCloudSyncing(true);
        const cloud = await listLicenseDrafts(token);
        const cloudMap = new Map<string, CloudLicenseDraft>(
          cloud.map((c) => [c.no, c]),
        );

        // 合并：云端数据为主，本地未同步的保留
        const merged: LicenseDraft[] = [];
        const seenNos = new Set<string>();

        // 云端草单
        for (const c of cloud) {
          merged.push(cloudToLocalDraft(c));
          seenNos.add(c.no);
        }

        // 本地未同步的草单（无 cloudId 且编号不重复）
        for (const d of local) {
          if (!d.cloudId && !seenNos.has(d.no)) {
            merged.push(d);
          }
        }

        merged.sort((a, b) => b.updatedAt - a.updatedAt);
        setDrafts(merged);
        setCloudLoaded(true);
      } catch (err) {
        console.warn('[draft-page] cloud sync failed:', err);
      } finally {
        setCloudSyncing(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  const filteredDrafts = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return drafts;
    return drafts.filter((d) => {
      const vins = getDraftVins(d);
      const contractNo = getDraftContractNo(d);
      const brand = getDraftBrand(d).toUpperCase();
      const model = getDraftModel(d).toUpperCase();
      return (
        d.no.toUpperCase().includes(q) ||
        d.exporter.toUpperCase().includes(q) ||
        d.country.toUpperCase().includes(q) ||
        d.title.toUpperCase().includes(q) ||
        (contractNo || '').toUpperCase().includes(q) ||
        vins.some((v) => v.toUpperCase().includes(q)) ||
        brand.includes(q) ||
        model.includes(q)
      );
    });
  }, [drafts, search]);

  // ─── 列表操作 ───
  const startNew = () => {
    // 优先恢复用户上次编辑过的内容；若从未保存过任何表单，则使用全新默认值
    const lastMain = recallLastMain<ExportLicenseMainData>();
    const lastAnnex = recallLastAnnex<ExportLicenseData>();
    setMain({
      ...getDefaultExportLicenseMain(),
      ...(lastMain ?? {}),
      // 每张新草单都应当是全新的明细行，避免误把上一单的车辆/价格带过来
      items: [newLicenseItem()],
    });
    setAnnex({
      ...getDefaultExportLicense(),
      ...(lastAnnex ?? {}),
    });
    setEditingId(null);
    setView('edit');
  };

  const openDraft = (d: LicenseDraft) => {
    const saved = (d.main as Partial<ExportLicenseMainData>) ?? {};
    const merged = { ...getDefaultExportLicenseMain(), ...saved };
    // 兼容老草稿：明细行可能缺少 currency / amountInUsd
    merged.items = (merged.items || []).map((it) => ({
      ...it,
      currency: it.currency || 'CNY',
      amountInUsd: it.amountInUsd ?? it.amountUsd ?? 0,
    }));
    setMain(merged);
    setAnnex((d.annex as ExportLicenseData) ?? getDefaultExportLicense());
    setEditingId(d.id);
    setView('edit');
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('确认删除这份草单？删除后不可恢复。')) return;
    const draft = drafts.find((d) => d.id === id);
    deleteDraft(id);
    // 云端同步删除
    if (draft?.cloudId && token) {
      try {
        await deleteLicenseDraft(token, draft.cloudId);
      } catch (err) {
        console.warn('[draft-page] cloud delete failed:', err);
      }
    }
    await refreshDrafts();
    toast.success('已删除');
  };

  const duplicateDraft = async (d: LicenseDraft, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const copy = saveDraft({
      no: `${d.no}-COPY`,
      title: `${d.title}（副本）`,
      exporter: d.exporter,
      country: d.country,
      vehicleCount: d.vehicleCount,
      totalAmount: d.totalAmount,
      status: 'draft',
      contractNo: getDraftContractNo(d),
      vins: getDraftVins(d),
      brand: getDraftBrand(d),
      model: getDraftModel(d),
      main: d.main,
      annex: d.annex,
    });
    // 云端同步副本
    if (token) {
      try {
        const cloud = await createLicenseDraft(token, {
          draftNo: copy.no,
          title: copy.title,
          exporter: copy.exporter,
          country: copy.country,
          vehicleCount: copy.vehicleCount,
          totalAmount: copy.totalAmount,
          status: copy.status,
          contractNo: copy.contractNo,
          vins: copy.vins,
          brand: copy.brand,
          model: copy.model,
          main: copy.main,
          annex: copy.annex,
        });
        copy.cloudId = cloud.id;
        markDraftsSynced([{ localId: copy.id, cloudId: cloud.id }]);
      } catch (err) {
        console.warn('[draft-page] cloud duplicate failed:', err);
      }
    }
    await refreshDrafts();
    toast.success(`已复制：${copy.title}`);
  };

  // 将本地草单批量迁移到云端
  const handleMigrate = async () => {
    if (!token) return;
    const local = getLocalDrafts().filter((d) => !d.cloudId);
    if (local.length === 0) {
      toast.info('没有需要迁移的本地草单');
      return;
    }
    setMigrating(true);
    try {
      const { succeeded, failed } = await migrateLocalDrafts(
        token,
        local,
        undefined,
      );
      if (succeeded > 0) {
        // 标记已同步
        // 由于 migrateLocalDrafts 通过 API 创建，我们需要重新获取云端列表来更新 cloudId
        await refreshDrafts();
        // 清空本地纯草单（已在云端有对应记录）
        clearLocalDrafts();
      }
      if (failed > 0) {
        toast.warning(`${succeeded} 份迁移成功，${failed} 份失败`);
      } else {
        toast.success(`已迁移 ${succeeded} 份草单到云端`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  // 本地未同步的草单数量
  const localOnlyCount = useMemo(
    () => drafts.filter((d) => !d.cloudId).length,
    [drafts],
  );

  // ─── 明细操作 ───
  const updateItem = (idx: number, patch: Partial<ExportLicenseItem>) => {
    setMain((prev) => {
      const items = prev.items.map((it, i) =>
        i === idx ? { ...it, ...patch } : it,
      );
      const target = items[idx];
      if (target) {
        const qty = Number(target.quantity) || 0;
        const price = Number(target.unitPriceUsd) || 0;
        target.amountUsd = qty * price;
        // 切换币种或单价/数量变化时：USD 自动同步总值折美元；其他币种保留用户已填值
        if (target.currency === 'USD') {
          target.amountInUsd = target.amountUsd;
        } else if (
          Object.prototype.hasOwnProperty.call(patch, 'currency') &&
          patch.currency === 'USD'
        ) {
          target.amountInUsd = target.amountUsd;
        }
      }
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setMain((prev) => ({ ...prev, items: [...prev.items, newLicenseItem()] }));
  };

  const removeItem = (idx: number) => {
    setMain((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((_, i) => i !== idx)
          : prev.items,
    }));
  };

  // ─── 保存 ───
  const handleSave = async () => {
    try {
      const totalAmt = main.items.reduce(
        (s, i) => s + (Number(i.amountInUsd) || 0),
        0,
      );
      const totalQty = main.items.reduce(
        (s, i) => s + (Number(i.quantity) || 0),
        0,
      );
      const saved = saveDraft({
        id: editingId ?? undefined,
        no: main.exportLicenseNo || '未命名',
        title: `许可证草单 ${main.exportLicenseNo || ''}`.trim(),
        exporter: main.exporterName,
        country: main.countryOfPurchase,
        vehicleCount: totalQty,
        totalAmount: totalAmt,
        status: 'draft',
        contractNo: main.contractNo || '',
        vins: annex.vin?.trim() ? [annex.vin.trim()] : [],
        brand: annex.brandCn || annex.brandEn || '',
        model: annex.modelCn || annex.modelEn || '',
        main,
        annex,
      });
      setEditingId(saved.id);
      // 保存草单时同步把整张表作为"上次内容"记住，下次新建可直接带入
      rememberLastForm(main, annex);

      // 云端同步
      if (token) {
        try {
          const cloudId = saved.cloudId || editingId
            ? (editingId ?? saved.cloudId ?? '')
            : undefined;
          // 新草单或已有 cloudId 的草单：走 create/update
          if (cloudId) {
            // 尝试更新云端记录
            const cloud = await updateLicenseDraft(token, cloudId, {
              draftNo: saved.no,
              title: saved.title,
              exporter: saved.exporter,
              country: saved.country,
              vehicleCount: saved.vehicleCount,
              totalAmount: saved.totalAmount,
              status: saved.status,
              contractNo: saved.contractNo,
              vins: saved.vins,
              brand: saved.brand,
              model: saved.model,
              main: saved.main,
              annex: saved.annex,
            });
            saved.cloudId = cloud.id;
            // 更新 localStorage 中的 cloudId
            markDraftsSynced([{ localId: saved.id, cloudId: cloud.id }]);
          } else {
            // 新草单：创建云端记录
            const cloud = await createLicenseDraft(token, {
              draftNo: saved.no,
              title: saved.title,
              exporter: saved.exporter,
              country: saved.country,
              vehicleCount: saved.vehicleCount,
              totalAmount: saved.totalAmount,
              status: saved.status,
              contractNo: saved.contractNo,
              vins: saved.vins,
              brand: saved.brand,
              model: saved.model,
              main: saved.main,
              annex: saved.annex,
            });
            saved.cloudId = cloud.id;
            markDraftsSynced([{ localId: saved.id, cloudId: cloud.id }]);
          }
        } catch (err) {
          console.warn('[draft-page] cloud save failed:', err);
          toast.warning('草单已保存到本地，但云端同步失败，稍后重试');
        }
      }

      await refreshDrafts();
      toast.success(editingId ? '草单已更新' : '草单已保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  // ─── 导出 PDF（严格两页） ───
  const handleExport = async () => {
    setExporting(true);
    const tid = toast.loading('正在生成 PDF（主证 + 附加信息表，共 2 页）…');
    try {
      await new Promise((r) => setTimeout(r, 50));
      await exportMultiToPDF(
        [
          { elementId: 'export-license-main-preview', orientation: 'portrait' },
          { elementId: 'export-license-preview', orientation: 'portrait' },
        ],
        `ExportLicense_${main.exportLicenseNo || 'draft'}`,
      );
      toast.dismiss(tid);
      toast.success('PDF 已生成，共 2 页 A4');
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setExporting(false);
    }
  };

  // ─── AI 证件识别 ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setExtracting(true);
    const tid = toast.loading('正在识别登记证/行驶证…');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('图片读取失败'));
        r.readAsDataURL(file);
      });
      const res = await fetch('/api/documents/extract-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '识别失败');
      const d = json.data;
      setAnnex((prev) => ({
        ...prev,
        vin: d.vin || prev.vin,
        brandCn: d.brand || prev.brandCn,
        brandEn: d.brandEn || prev.brandEn,
        modelCn: d.model || prev.modelCn,
        modelEn: d.modelEn || prev.modelEn,
        engineMode: d.engineNo || prev.engineMode,
        bodyStructure: d.bodyStructure || prev.bodyStructure,
        seatingCapacity: d.seatingCapacity || prev.seatingCapacity,
        vehicleWeightKg: d.netWeight
          ? String(d.netWeight)
          : prev.vehicleWeightKg,
        grossVehicleWeightKg: d.grossWeight
          ? String(d.grossWeight)
          : prev.grossVehicleWeightKg,
        fuelTypeCn: d.fuelTypeCn || prev.fuelTypeCn,
        fuelTypeEn: d.fuelTypeEn || prev.fuelTypeEn,
        lengthMm: d.lengthMm || prev.lengthMm,
        widthMm: d.widthMm || prev.widthMm,
        heightMm: d.heightMm || prev.heightMm,
        mileageKm: d.mileageKm || prev.mileageKm,
      }));
      toast.dismiss(tid);
      toast.success('证件信息已自动填入附加信息表');
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err instanceof Error ? err.message : '识别失败');
    } finally {
      setExtracting(false);
    }
  };

  const totalQty = useMemo(
    () => main.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    [main.items],
  );
  // 原币合计：当所有明细币种一致时直接展示，否则只展示折美元合计
  const totalCurrency = useMemo(() => {
    const currencies = new Set(
      main.items.map((i) => i.currency || 'CNY'),
    );
    return currencies.size === 1 ? [...currencies][0] : '';
  }, [main.items]);
  const totalAmt = useMemo(
    () => main.items.reduce((s, i) => s + (Number(i.amountUsd) || 0), 0),
    [main.items],
  );
  const totalUsdAmt = useMemo(
    () => main.items.reduce((s, i) => s + (Number(i.amountInUsd) || 0), 0),
    [main.items],
  );

  // ─── 自动记忆：用户每次改动都把整张表存到 localStorage（防抖 600ms），
  // 下一次"新建草单"时自动带入，用户只需在历史基础上修改。
  useEffect(() => {
    if (view !== 'edit') return;
    const t = setTimeout(() => {
      rememberLastForm(main, annex);
    }, 600);
    return () => clearTimeout(t);
  }, [main, annex, view]);

  // ─── 列表视图 ───
  if (view === 'list') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/export-license"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">许可证草单</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                在线制作出口许可证主证与附加信息表，完成后跳转商务部正式申请。
              </p>
            </div>
          </div>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建草单
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-primary" />
                我的草单
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  共 {drafts.length} 份
                </span>
                {cloudSyncing && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
                )}
                {cloudLoaded && !cloudSyncing && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded font-normal">
                    云端同步
                  </span>
                )}
                {localOnlyCount > 0 && cloudLoaded && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 ml-auto"
                    onClick={handleMigrate}
                    disabled={migrating}
                  >
                    {migrating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    迁移{localOnlyCount}份本地草单到云端
                  </Button>
                )}
              </CardTitle>
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="搜索编号 / 合同号 / VIN / 品牌 / 车型"
                  className="pl-8 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileEdit className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {drafts.length === 0 ? '还没有草单' : '没有匹配的草单'}
                </p>
                {drafts.length === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={startNew}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    新建第一份草单
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30 text-xs text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2.5">
                        草单编号
                      </th>
                      <th className="text-left font-medium px-4 py-2.5">
                        合同号
                      </th>
                      <th className="text-left font-medium px-4 py-2.5">
                        出口商
                      </th>
                      <th className="text-left font-medium px-4 py-2.5">
                        VIN / 品牌 / 车型
                      </th>
                      <th className="text-right font-medium px-4 py-2.5">
                        车辆数
                      </th>
                      <th className="text-right font-medium px-4 py-2.5">
                        总值 (USD)
                      </th>
                      <th className="text-left font-medium px-4 py-2.5">
                        更新时间
                      </th>
                      <th className="text-center font-medium px-4 py-2.5">
                        状态
                      </th>
                      <th className="text-right font-medium px-4 py-2.5">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrafts.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => openDraft(d)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium">
                          {d.no}
                          {d.cloudId && (
                            <span title="已同步云端"><Globe className="inline-block h-3 w-3 ml-1 text-emerald-500 align-middle" /></span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground/90 max-w-[140px] truncate">
                          {getDraftContractNo(d) || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate">
                          {d.exporter || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          {(() => {
                            const vins = getDraftVins(d);
                            const brand = getDraftBrand(d);
                            const model = getDraftModel(d);
                            if (
                              vins.length === 0 &&
                              !brand &&
                              !model
                            ) {
                              return (
                                <span className="text-xs text-muted-foreground">
                                  未填写
                                </span>
                              );
                            }
                            return (
                              <div className="flex flex-col gap-0.5">
                                {vins.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {vins.slice(0, 3).map((v, i) => (
                                      <span
                                        key={`${d.id}-vin-${i}`}
                                        className="inline-block font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-muted text-foreground/80"
                                      >
                                        {v}
                                      </span>
                                    ))}
                                    {vins.length > 3 && (
                                      <span className="inline-block text-[10.5px] px-1.5 py-0.5 text-muted-foreground">
                                        +{vins.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                                {(brand || model) && (
                                  <span className="text-xs text-foreground/80 truncate">
                                    {[brand, model].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {d.vehicleCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          ${d.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(d.updatedAt).toLocaleString('zh-CN', {
                            hour12: false,
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.status === 'draft' ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              草稿
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] font-normal bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              已提交
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => duplicateDraft(d, e)}
                              title="复制"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => handleDelete(d.id, e)}
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── 编辑器视图 ───
  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回草单列表
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-lg font-semibold leading-tight flex items-center gap-2">
              {editingId ? '编辑草单' : '新建草单'}
              <span className="text-[11px] font-normal text-muted-foreground font-mono">
                {main.exportLicenseNo || '未命名'}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            保存草单
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            导出 PDF（2 页）
          </Button>
        </div>
      </div>

      {/* 警示条 */}
      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          本草单仅供内部草拟、核对、报送参考使用，<u>不具备任何法律效力</u>。
          完成后请前往「商务部业务系统统一平台」提交正式申请。
        </p>
      </div>

      {/* 左右分栏：单一表单 + 两页预览 */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <UnifiedForm
            main={main}
            setMain={setMain}
            annex={annex}
            setAnnex={setAnnex}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
            totalQty={totalQty}
            totalAmt={totalAmt}
            totalUsdAmt={totalUsdAmt}
            totalCurrency={totalCurrency}
            fileRef={fileRef}
            onPickFile={() => fileRef.current?.click()}
            extracting={extracting}
            onFileChange={handleFileChange}
            contractSearchOpen={contractSearchOpen}
            setContractSearchOpen={setContractSearchOpen}
            contractSearchLoading={contractSearchLoading}
            contractSearchResults={contractSearchResults}
            searchContracts={searchContracts}
            handleContractSelect={handleContractSelect}
          />
        </div>

        <div className="xl:col-span-3">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground">
                A4 预览 · 严格两页（主证 + 附加信息表）
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="overflow-auto">
              <div className="flex flex-col items-center gap-4">
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  className="transition-transform shadow-float"
                >
                  <ExportLicenseMainPreview data={main} />
                </div>
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  className="transition-transform shadow-float"
                >
                  <ExportLicensePreview data={annex} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 统一表单（主证 + 附加表合并编辑）
// ────────────────────────────────────────────────────────────────────

interface UnifiedFormProps {
  main: ExportLicenseMainData;
  setMain: React.Dispatch<React.SetStateAction<ExportLicenseMainData>>;
  annex: ExportLicenseData;
  setAnnex: React.Dispatch<React.SetStateAction<ExportLicenseData>>;
  updateItem: (idx: number, patch: Partial<ExportLicenseItem>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  totalQty: number;
  totalAmt: number;
  totalUsdAmt: number;
  totalCurrency: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: () => void;
  extracting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // 合同号搜索联动
  contractSearchOpen: boolean;
  setContractSearchOpen: (v: boolean) => void;
  contractSearchLoading: boolean;
  contractSearchResults: { id: string; invoice_no: string; currency: string; vehicleCount: number; vehicles: Record<string, unknown>[] }[];
  searchContracts: (q: string) => void;
  handleContractSelect: (item: { id: string; invoice_no: string; currency: string; vehicles: Record<string, unknown>[] }) => void;
}

function UnifiedForm({
  main,
  setMain,
  annex,
  setAnnex,
  updateItem,
  addItem,
  removeItem,
  totalQty,
  totalAmt,
  totalUsdAmt,
  totalCurrency,
  fileRef,
  onPickFile,
  extracting,
  onFileChange,
  contractSearchOpen,
  setContractSearchOpen,
  contractSearchLoading,
  contractSearchResults,
  searchContracts,
  handleContractSelect,
}: UnifiedFormProps) {
  const ownerDifferent = !!annex.ownerDifferent;
  return (
    <>
      {/* 整单信息 */}
      <FormCard title="① 整单信息">
        <div className="grid grid-cols-2 gap-3">
          <Field label="3. 出口许可证号" hint="Licence No.（主证 / 附加表通用）">
            <Input
              className="font-mono"
              value={main.exportLicenseNo}
              onChange={(e) =>
                setMain({ ...main, exportLicenseNo: e.target.value })
              }
            />
          </Field>
          <Field label="4. 有效截止日期">
            <Input
              value={main.expiryDate}
              onChange={(e) => setMain({ ...main, expiryDate: e.target.value })}
            />
          </Field>
          <Field label="5. 贸易方式">
            <Input
              value={main.termsOfTrade}
              onChange={(e) => setMain({ ...main, termsOfTrade: e.target.value })}
            />
          </Field>
          <Field label="8. 进口国（地区）">
            <Input
              value={main.countryOfPurchase}
              onChange={(e) =>
                setMain({ ...main, countryOfPurchase: e.target.value })
              }
            />
          </Field>
          <Field label="6. 合同号" hint="Contract No.">
            <Popover open={contractSearchOpen} onOpenChange={setContractSearchOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={contractSearchOpen}
                  className="flex w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-mono shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className={main.contractNo ? '' : 'text-muted-foreground'}>
                    {main.contractNo || '搜索合同号关联…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="输入合同号搜索…"
                    onValueChange={searchContracts}
                  />
                  <CommandList>
                    {contractSearchLoading && (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        搜索中…
                      </div>
                    )}
                    {!contractSearchLoading && contractSearchResults.length === 0 && (
                      <CommandEmpty>暂无合同草单</CommandEmpty>
                    )}
                    {contractSearchResults.length > 0 && (
                      <CommandGroup heading="形式发票 / 合同">
                        {contractSearchResults.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.invoice_no}
                            onSelect={() => handleContractSelect(item)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-mono text-sm">{item.invoice_no}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.currency} · {item.vehicleCount} 辆车
                            </span>
                            {item.invoice_no === main.contractNo && (
                              <Check className="ml-1 h-3.5 w-3.5 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>
          <Field label="9. 付款方式">
            <Input
              value={main.payment}
              onChange={(e) => setMain({ ...main, payment: e.target.value })}
            />
          </Field>
          <Field label="7. 报关口岸">
            <Input
              value={main.placeOfClearance}
              onChange={(e) =>
                setMain({ ...main, placeOfClearance: e.target.value })
              }
            />
          </Field>
          <Field label="10. 运输方式">
            <Input
              value={main.modeOfTransport}
              onChange={(e) =>
                setMain({ ...main, modeOfTransport: e.target.value })
              }
            />
          </Field>
          <Field label="21. 发证日期" hint="Licence date（主证 / 附加表通用）">
            <Input
              value={main.licenceDate}
              onChange={(e) => setMain({ ...main, licenceDate: e.target.value })}
            />
          </Field>
        </div>
      </FormCard>

      {/* 出口商 / 发货人 */}
      <FormCard
        title="② 出口商 / 发货人"
        action={
          <LicensePartyPicker
            value={{
              exporterName: main.exporterName,
              exporterKeyNo: main.exporterKeyNo,
              exporterCode: main.exporterCode,
              consignorName: main.consignorName,
              consignorKeyNo: main.consignorKeyNo,
              consignorCode: main.consignorCode,
            }}
            onPick={(fields) => setMain((prev) => ({ ...prev, ...fields }))}
          />
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="1. 出口商名称" wide>
            <Input
              value={main.exporterName}
              onChange={(e) => setMain({ ...main, exporterName: e.target.value })}
            />
          </Field>
          <Field label="出口商电子钥匙编号 / 统一社会信用代码" wide>
            <div className="space-y-3">
              <Input
                className="font-mono"
                placeholder="电子钥匙编号（如 4401MACPQJKN0）"
                value={main.exporterKeyNo}
                onChange={(e) => setMain({ ...main, exporterKeyNo: e.target.value })}
              />
              <Input
                className="font-mono"
                placeholder="统一社会信用代码（如 91440113MACPQJKN06）"
                value={main.exporterCode}
                onChange={(e) => setMain({ ...main, exporterCode: e.target.value })}
              />
            </div>
          </Field>
          <Field label="2. 发货人名称" wide>
            <Input
              value={main.consignorName}
              onChange={(e) =>
                setMain({ ...main, consignorName: e.target.value })
              }
            />
          </Field>
          <Field label="发货人电子钥匙编号 / 统一社会信用代码" wide>
            <div className="space-y-3">
              <Input
                className="font-mono"
                placeholder="电子钥匙编号（如 4401MACPQJKN0）"
                value={main.consignorKeyNo}
                onChange={(e) =>
                  setMain({ ...main, consignorKeyNo: e.target.value })
                }
              />
              <Input
                className="font-mono"
                placeholder="统一社会信用代码（如 91440113MACPQJKN06）"
                value={main.consignorCode}
                onChange={(e) =>
                  setMain({ ...main, consignorCode: e.target.value })
                }
              />
            </div>
          </Field>
        </div>
      </FormCard>

      {/* 商品信息 */}
      <FormCard
        title="③ 商品信息（第 11 栏）"
        action={
          <LicenseSnippetPicker<{
            descriptionOfGoods: string;
            codeOfGoods: string;
            equipmentStatus: string;
          }>
            kind="goods"
            label="商品信息"
            value={{
              descriptionOfGoods: main.descriptionOfGoods,
              codeOfGoods: main.codeOfGoods,
              equipmentStatus: main.equipmentStatus,
            }}
            isEmpty={(v) =>
              !v.descriptionOfGoods.trim() &&
              !v.codeOfGoods.trim() &&
              !v.equipmentStatus.trim()
            }
            previewLines={(v) =>
              [
                v.descriptionOfGoods,
                v.codeOfGoods ? `HS：${v.codeOfGoods}` : '',
                v.equipmentStatus ? `设备状态：${v.equipmentStatus}` : '',
              ].filter(Boolean)
            }
            listProfiles={listGoodsProfiles}
            saveProfile={saveGoodsProfile}
            touchProfile={touchGoodsProfile}
            deleteProfile={deleteGoodsProfile}
            onPick={(d) => setMain((prev) => ({ ...prev, ...d }))}
          />
        }
      >
        <div className="space-y-3">
          <Field label="11. 商品名称" hint="Description of goods">
            <Textarea
              className="min-h-[60px]"
              value={main.descriptionOfGoods}
              onChange={(e) =>
                setMain({ ...main, descriptionOfGoods: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="商品编码" hint="Code of goods">
              <Input
                className="font-mono"
                value={main.codeOfGoods}
                onChange={(e) => setMain({ ...main, codeOfGoods: e.target.value })}
              />
            </Field>
            <Field label="设备状态">
              <Select
                value={main.equipmentStatus}
                onValueChange={(v) => setMain({ ...main, equipmentStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="旧">旧（Used）</SelectItem>
                  <SelectItem value="新">新（New）</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </FormCard>

      {/* 商品明细 */}
      <FormCard
        title="④ 商品明细（第 12–17 栏）"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addItem}
          >
            <Plus className="mr-1 h-3 w-3" />
            新增明细
          </Button>
        }
      >
        <div className="space-y-2">
          {main.items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-md border border-border/60 p-2.5 bg-muted/20 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  #{idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  disabled={main.items.length <= 1}
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Field label="规格、等级" hint="Specification">
                <Input
                  value={item.specification}
                  onChange={(e) =>
                    updateItem(idx, { specification: e.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-12 gap-2">
                <Field label="单位" className="col-span-3">
                  <Input
                    value={item.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  />
                </Field>
                <Field label="数量" className="col-span-3">
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="币种" className="col-span-2">
                  <Select
                    value={item.currency || 'CNY'}
                    onValueChange={(v) => updateItem(idx, { currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label={`单价 ${item.currency || 'CNY'}`}
                  className="col-span-4"
                >
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPriceUsd}
                    onChange={(e) =>
                      updateItem(idx, {
                        unitPriceUsd: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 flex items-center justify-between rounded bg-background px-2 py-1.5 text-[11px]">
                  <span className="text-muted-foreground">本行总值</span>
                  <span className="font-mono font-semibold">
                    {(item.currency || 'CNY')}{' '}
                    {(item.quantity * item.unitPriceUsd).toLocaleString()}
                  </span>
                </div>
                <Field
                  label="总值折美元 (USD)"
                  className="col-span-6"
                  hint={
                    item.currency === 'USD'
                      ? '币种为 USD，已自动同步'
                      : '按实际汇率折美元填写'
                  }
                >
                  <Input
                    type="number"
                    min={0}
                    value={item.amountInUsd}
                    disabled={item.currency === 'USD'}
                    onChange={(e) =>
                      updateItem(idx, {
                        amountInUsd: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
            <span className="font-medium text-primary">
              合计 · {totalQty} 辆
            </span>
            <span className="font-mono font-bold text-primary tabular-nums">
              USD {totalUsdAmt.toLocaleString()}
              {totalCurrency && totalCurrency !== 'USD' && totalAmt > 0 && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  {totalCurrency} {totalAmt.toLocaleString()}
                </span>
              )}
            </span>
          </div>
        </div>
      </FormCard>

      {/* 车辆识别（附加表） */}
      <FormCard
        title="⑤ 车辆识别信息（附加信息表）"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={extracting}
            onClick={onPickFile}
          >
            {extracting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <ScanLine className="mr-1 h-3 w-3" />
            )}
            {extracting ? '识别中…' : '上传证件识别'}
          </Button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3">
          上传机动车登记证或行驶证照片，自动识别 VIN、品牌、车型等车辆字段。
        </p>

        <div className="space-y-3">
          <Field label="车架号 VIN">
            <Input
              className="font-mono uppercase"
              maxLength={17}
              value={annex.vin}
              onChange={(e) =>
                setAnnex({ ...annex, vin: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="品牌（中文）">
              <Input
                value={annex.brandCn}
                onChange={(e) => setAnnex({ ...annex, brandCn: e.target.value })}
              />
            </Field>
            <Field label="Make（英文）">
              <Input
                value={annex.brandEn}
                onChange={(e) => setAnnex({ ...annex, brandEn: e.target.value })}
              />
            </Field>
            <Field label="车型（中文）">
              <Input
                value={annex.modelCn}
                onChange={(e) => setAnnex({ ...annex, modelCn: e.target.value })}
              />
            </Field>
            <Field label="Model（英文）">
              <Input
                value={annex.modelEn}
                onChange={(e) => setAnnex({ ...annex, modelEn: e.target.value })}
              />
            </Field>
          </div>
          <Field label="发动机型号" hint="Engine Mode">
            <Input
              className="font-mono"
              value={annex.engineMode}
              onChange={(e) =>
                setAnnex({ ...annex, engineMode: e.target.value })
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="使用性质（中文）">
              <Input
                value={annex.purposeCn}
                onChange={(e) => setAnnex({ ...annex, purposeCn: e.target.value })}
              />
            </Field>
            <Field label="Purpose">
              <Input
                value={annex.purposeEn}
                onChange={(e) => setAnnex({ ...annex, purposeEn: e.target.value })}
              />
            </Field>
            <Field label="车身结构">
              <Input
                value={annex.bodyStructure || ''}
                onChange={(e) =>
                  setAnnex({ ...annex, bodyStructure: e.target.value })
                }
              />
            </Field>
            <Field label="核定载客">
              <Input
                value={annex.seatingCapacity}
                onChange={(e) =>
                  setAnnex({ ...annex, seatingCapacity: e.target.value })
                }
              />
            </Field>
            <Field label="里程表读数 (km)">
              <Input
                value={annex.mileageKm}
                onChange={(e) => setAnnex({ ...annex, mileageKm: e.target.value })}
              />
            </Field>
            <Field label="燃料类型（中文）">
              <Input
                value={annex.fuelTypeCn}
                onChange={(e) =>
                  setAnnex({ ...annex, fuelTypeCn: e.target.value })
                }
              />
            </Field>
            <Field label="Fuel Type">
              <Input
                value={annex.fuelTypeEn}
                onChange={(e) =>
                  setAnnex({ ...annex, fuelTypeEn: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="自重 (kg)">
              <Input
                value={annex.vehicleWeightKg}
                onChange={(e) =>
                  setAnnex({ ...annex, vehicleWeightKg: e.target.value })
                }
              />
            </Field>
            <Field label="总质量 (kg)">
              <Input
                value={annex.grossVehicleWeightKg}
                onChange={(e) =>
                  setAnnex({ ...annex, grossVehicleWeightKg: e.target.value })
                }
              />
            </Field>
            <Field label="车长 (mm)">
              <Input
                value={annex.lengthMm}
                onChange={(e) => setAnnex({ ...annex, lengthMm: e.target.value })}
              />
            </Field>
            <Field label="车宽 (mm)">
              <Input
                value={annex.widthMm}
                onChange={(e) => setAnnex({ ...annex, widthMm: e.target.value })}
              />
            </Field>
            <Field label="车高 (mm)">
              <Input
                value={annex.heightMm}
                onChange={(e) => setAnnex({ ...annex, heightMm: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </FormCard>

      {/* 车主信息（默认与出口商一致，可展开独立填写） */}
      <FormCard
        title="⑥ 车主信息（附加信息表 · Owner）"
        action={
          ownerDifferent ? (
            <LicenseSnippetPicker<{
              ownerNameCn: string;
              ownerNameEn: string;
              ownerAddressCn: string;
              ownerAddressEn: string;
            }>
              kind="owner"
              label="车主信息"
              value={{
                ownerNameCn: annex.ownerNameCn,
                ownerNameEn: annex.ownerNameEn,
                ownerAddressCn: annex.ownerAddressCn,
                ownerAddressEn: annex.ownerAddressEn,
              }}
              isEmpty={(v) =>
                !v.ownerNameCn.trim() &&
                !v.ownerNameEn.trim() &&
                !v.ownerAddressCn.trim() &&
                !v.ownerAddressEn.trim()
              }
              previewLines={(v) =>
                [
                  [v.ownerNameCn, v.ownerNameEn].filter(Boolean).join(' / '),
                  v.ownerAddressCn,
                  v.ownerAddressEn,
                ].filter(Boolean)
              }
              listProfiles={listOwnerProfiles}
              saveProfile={saveOwnerProfile}
              touchProfile={touchOwnerProfile}
              deleteProfile={deleteOwnerProfile}
              onPick={(d) => setAnnex((prev) => ({ ...prev, ...d }))}
            />
          ) : null
        }
      >
        <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            checked={ownerDifferent}
            onChange={(e) =>
              setAnnex((prev) => ({
                ...prev,
                ownerDifferent: e.target.checked,
                // 取消勾选时把车主名同步回出口商，避免预览出现脏数据
                ownerNameCn: e.target.checked ? prev.ownerNameCn : main.exporterName,
              }))
            }
          />
          <span className="text-xs leading-relaxed">
            车主 / 卖方与出口商不同
            <span className="text-muted-foreground ml-1">
              （不勾选时默认使用出口商「{main.exporterName || '—'}」）
            </span>
          </span>
        </label>

        {ownerDifferent ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="车主名称（中文）">
                <Input
                  value={annex.ownerNameCn}
                  onChange={(e) =>
                    setAnnex({ ...annex, ownerNameCn: e.target.value })
                  }
                />
              </Field>
              <Field label="Owner Name (English)">
                <Input
                  value={annex.ownerNameEn}
                  onChange={(e) =>
                    setAnnex({ ...annex, ownerNameEn: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="车主地址（中文）">
              <Textarea
                className="min-h-[50px]"
                value={annex.ownerAddressCn}
                onChange={(e) =>
                  setAnnex({ ...annex, ownerAddressCn: e.target.value })
                }
              />
            </Field>
            <Field label="Owner Address (English)">
              <Textarea
                className="min-h-[50px]"
                value={annex.ownerAddressEn}
                onChange={(e) =>
                  setAnnex({ ...annex, ownerAddressEn: e.target.value })
                }
              />
            </Field>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11.5px] text-muted-foreground flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" />
            已自动引用出口商：
            <span className="font-medium text-foreground">
              {main.exporterName || '（请先在上方填写出口商名称）'}
            </span>
          </div>
        )}
      </FormCard>

      {/* 备注 */}
      <FormCard title="⑦ 备注（第 19 栏，两表通用）">
        <Textarea
          className="min-h-[70px]"
          value={main.supplementaryDetails}
          onChange={(e) =>
            setMain({ ...main, supplementaryDetails: e.target.value })
          }
        />
      </FormCard>
    </>
  );
}


// ────────────────────────────────────────────────────────────────────
// 通用小组件
// ────────────────────────────────────────────────────────────────────

function FormCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  wide,
  className,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(wide ? 'col-span-2' : '', className)}>
      <Label className="text-[11.5px] flex items-center gap-1.5">
        {label}
        {hint && (
          <span className="text-[10px] text-muted-foreground/80 italic">
            {hint}
          </span>
        )}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
