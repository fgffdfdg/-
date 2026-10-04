'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useVinAutoFill } from '@/lib/vehicle-linkage/use-vin-autofill';
import { searchVehicleArchives } from '@/lib/vehicle-linkage/client';
import type { VinSuggestion } from '@/lib/vehicle-linkage/client';
import { toast } from 'sonner';
import { Loader2, X, ChevronDown, Pencil, Trash2, Check } from 'lucide-react';
import InvoicePreview from '@/components/documents/invoice-preview';
import PackingListPreview from '@/components/documents/packing-list-preview';
import ContractPreview from '@/components/documents/contract-preview';
import CompanyProfilePicker from '@/components/documents/company-profile-picker';
import { BuyerProfilePicker } from '@/components/documents/buyer-profile-picker';
import type { BuyerProfile } from '@/components/documents/buyer-profile-picker';
import type {
  TradeDocumentsFormData,
  TradeDocumentsFormVehicle,
  InvoiceData,
  PackingListData,
  ContractData,
  CompanyInfo,
} from '@/components/documents/types';

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────

const ENERGY_TYPES = [
  { en: 'Battery Electric', zh: '纯电动' },
  { en: 'Plug-in Hybrid', zh: '插电式混合动力' },
  { en: 'Hybrid', zh: '混合动力' },
  { en: 'Range-Extended Electric', zh: '增程式电动' },
  { en: 'Gasoline', zh: '汽油' },
  { en: 'Diesel', zh: '柴油' },
];

const BODY_TYPES = [
  { en: 'Passenger Vehicle', zh: '乘用车' },
  { en: 'Sedan', zh: '轿车' },
  { en: 'SUV', zh: 'SUV' },
  { en: 'MPV', zh: 'MPV' },
  { en: 'Hatchback', zh: '两厢车' },
  { en: 'Pickup', zh: '皮卡' },
  { en: 'Commercial Vehicle', zh: '商用车' },
];

const INCOTERMS = ['FCA', 'FOB', 'CIF', 'EXW', 'DDP'];
const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'CHF'];
const TOLERANCE_OPTIONS = [
  { label: '±5%', value: '5' },
  { label: 'No tolerance', value: '0' },
  { label: '±10%', value: '10' },
];
const PAYMENT_TERMS_OPTIONS = ['T/T,100% in advance', 'L/C', '30% deposit, 70% before shipment'];

const EMPTY_VEHICLE: TradeDocumentsFormVehicle = {
  condition: 'Used',
  brand: '',
  brandEn: '',
  model: '',
  vin: '',
  energyType: 'Battery Electric',
  power: '',
  bodyType: 'Passenger Vehicle',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  netWeight: '',
  grossWeight: '',
  packages: 1,
  marks: 'N/M',
  remarks: '',
};

function emptyFormData(): TradeDocumentsFormData {
  const today = new Date().toISOString().slice(0, 10);
  const defaultConsignee = { name: '', nameEn: '', address: '', addressEn: '', country: '', countryEn: '', tel: '', email: '', contact: '' };
  return {
    seller: { name: '', nameEn: '', address: '', addressEn: '', country: 'China', countryEn: '', phone: '', email: '', contact: '' },
    buyer: { name: '', nameEn: '', address: '', addressEn: '', country: '', countryEn: '', tel: '', email: '', contact: '' },
    sameAsBuyer: true,
    consignee: { ...defaultConsignee },
    tradeInfo: {
      invoiceNo: '',
      invoiceDate: today,
      contractNo: '',
      signDate: today,
      signPlace: '',
      plNo: '',
      plDate: today,
      tradeTerm: 'FCA',
      tradePlace: '',
      currency: 'USD',
      loadingPort: 'Nansha Port, China',
      destination: '',
      latestLoadingDate: '',
      paymentTerms: 'T/T,100% in advance',
      tolerance: '5',
    },
    vehicles: [{ ...EMPTY_VEHICLE }],
  };
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

/** 查询指定日期+前缀的下一个序号 */
async function fetchNextSeq(date: string, prefix: string, token: string): Promise<number> {
  try {
    const d = date.replace(/-/g, '');
    const res = await fetch(`/api/trade-documents/next-seq?date=${d}&prefix=${prefix}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 1;
    const json = await res.json();
    return (json.nextSeq || 1);
  } catch { return 1; }
}

function formVehicleToVehicleItem(v: TradeDocumentsFormVehicle, idx: number) {
  return {
    id: `v_${Date.now()}_${idx}`,
    vin: v.vin,
    brand: v.brand,
    brandEn: v.brandEn,
    model: v.model,
    year: '',
    color: '',
    quantity: v.quantity,
    unitPrice: v.unitPrice,
    totalPrice: v.unitPrice * v.quantity,
    condition: v.condition as 'New' | 'Used',
    energyType: v.energyType,
    bodyType: v.bodyType,
    power: v.power,
    netWeight: Number(v.netWeight) || 0,
    grossWeight: Number(v.grossWeight) || 0,
    packages: v.packages,
    marks: v.marks,
    remarks: v.remarks,
  };
}

function buildInvoiceData(form: TradeDocumentsFormData): InvoiceData {
  const vehicles = form.vehicles.map((v, i) => formVehicleToVehicleItem(v, i));
  const totalAmount = vehicles.reduce((s, v) => s + v.totalPrice, 0);
  return {
    invoiceNo: form.tradeInfo.invoiceNo,
    invoiceDate: form.tradeInfo.invoiceDate,
    seller: form.seller,
    buyer: {
      name: form.buyer.nameEn || form.buyer.name,
      nameEn: form.buyer.nameEn,
      address: form.buyer.addressEn || form.buyer.address,
      addressEn: form.buyer.addressEn,
      country: form.buyer.countryEn || form.buyer.country,
      countryEn: form.buyer.countryEn,
      contact: form.buyer.contact,
      phone: form.buyer.tel,
      email: form.buyer.email,
    },
    consignee: form.sameAsBuyer ? undefined : {
      name: form.consignee.nameEn || form.consignee.name,
      nameEn: form.consignee.nameEn,
      address: form.consignee.addressEn || form.consignee.address,
      addressEn: form.consignee.addressEn,
      country: form.consignee.countryEn || form.consignee.country,
      countryEn: form.consignee.countryEn,
      contact: form.consignee.contact,
      phone: form.consignee.tel,
      email: form.consignee.email,
    },
    vehicles,
    totalAmount,
    currency: form.tradeInfo.currency,
    paymentTerms: form.tradeInfo.paymentTerms,
    tradeTerms: form.tradeInfo.tradeTerm,
    tradePlace: form.tradeInfo.tradePlace,
    loadingPort: form.tradeInfo.loadingPort,
    destinationPort: form.tradeInfo.destination,
    remarks: '',
  };
}

function buildPackingListData(form: TradeDocumentsFormData): PackingListData {
  const vehicles = form.vehicles.map((v, i) => formVehicleToVehicleItem(v, i));
  const totalPackages = vehicles.reduce((s, v) => s + (v.packages || 1), 0);
  const grossWeight = vehicles.reduce((s, v) => s + (v.grossWeight || 0), 0);
  const netWeight = vehicles.reduce((s, v) => s + (v.netWeight || 0), 0);
  return {
    plNo: form.tradeInfo.plNo,
    plDate: form.tradeInfo.plDate,
    seller: form.seller,
    buyer: {
      name: form.buyer.nameEn || form.buyer.name,
      nameEn: form.buyer.nameEn,
      address: form.buyer.addressEn || form.buyer.address,
      addressEn: form.buyer.addressEn,
      country: form.buyer.countryEn || form.buyer.country,
      countryEn: form.buyer.countryEn,
      contact: form.buyer.contact,
      phone: form.buyer.tel,
      email: form.buyer.email,
    },
    vessels: '',
    voyage: '',
    blNo: '',
    containerNo: '',
    sealNo: '',
    containerType: '',
    vehicles,
    grossWeight,
    netWeight,
    totalPackages,
    remarks: '',
  };
}

function buildContractData(form: TradeDocumentsFormData): ContractData {
  const vehicles = form.vehicles.map((v, i) => formVehicleToVehicleItem(v, i));
  const totalAmount = vehicles.reduce((s, v) => s + v.totalPrice, 0);
  return {
    contractNo: form.tradeInfo.contractNo,
    signDate: form.tradeInfo.signDate,
    signPlace: form.tradeInfo.signPlace,
    seller: form.seller,
    buyer: {
      name: form.buyer.nameEn || form.buyer.name,
      nameEn: form.buyer.nameEn,
      address: form.buyer.addressEn || form.buyer.address,
      addressEn: form.buyer.addressEn,
      country: form.buyer.countryEn || form.buyer.country,
      countryEn: form.buyer.countryEn,
      contact: form.buyer.contact,
      phone: form.buyer.tel,
      email: form.buyer.email,
    },
    vehicles,
    totalAmount,
    currency: form.tradeInfo.currency,
    paymentTerms: form.tradeInfo.paymentTerms,
    deliveryTerms: form.tradeInfo.tradeTerm,
    loadingPort: form.tradeInfo.loadingPort,
    destinationPort: form.tradeInfo.destination,
    deliveryDate: form.tradeInfo.latestLoadingDate,
    inspectionTerms: '',
    warrantyTerms: '',
    governingLaw: '',
    tolerance: form.tradeInfo.tolerance,
    remarks: '',
  };
}

// ──────────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────────

type PreviewTab = 'all' | 'invoice' | 'packing-list' | 'contract';

interface SavedDocument {
  id: string;
  title: string;
  doc_data: TradeDocumentsFormData;
  created_at: string;
  updated_at: string;
}

const TYPE_THEME: Record<string, { badge: string; button: string }> = {
  all: { badge: 'bg-primary text-primary-foreground', button: 'bg-primary text-primary-foreground' },
  invoice: { badge: 'bg-amber-500 text-white', button: 'bg-amber-500 text-white hover:bg-amber-600' },
  'packing-list': { badge: 'bg-emerald-500 text-white', button: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  contract: { badge: 'bg-sky-600 text-white', button: 'bg-sky-600 text-white hover:bg-sky-700' },
};

export default function TradeDocumentsNewPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { lookupByVin, isLoading: vinLookupLoading } = useVinAutoFill('invoice');
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const [formData, setFormData] = useState<TradeDocumentsFormData>(emptyFormData);

  const [activeTab, setActiveTab] = useState<PreviewTab>('all');

  // Save / Load
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentDraftTitle, setCurrentDraftTitle] = useState('');
  const [isEditing, setIsEditing] = useState(true); // new draft = editable by default
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formWidth, setFormWidth] = useState(480);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // ── Load draft list (must be defined early, before handleSave references it) ──
  const loadSavedDocs = useCallback(async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/trade-documents?limit=30', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '加载失败');
      setSavedDocs(json.data || []);
    } catch (e) {
      console.error('加载草稿列表失败:', e);
    } finally {
      setLoadingDocs(false);
    }
  }, [user, token]);

  // ── Auto-generate doc numbers ──
  const generateDocNos = useCallback(async (date: string) => {
    const d = date.replace(/-/g, '');
    const [invSeq, plSeq, conSeq] = await Promise.all([
      fetchNextSeq(date, 'INV', token),
      fetchNextSeq(date, 'PL', token),
      fetchNextSeq(date, 'CON', token),
    ]);
    setFormData(prev => ({
      ...prev,
      tradeInfo: {
        ...prev.tradeInfo,
        invoiceNo: `INV${d}-${invSeq}`,
        plNo: `PL${d}-${plSeq}`,
        contractNo: `CON${d}-${conSeq}`,
      },
    }));
  }, [token]);

  // Initial auto-generation on mount
  useEffect(() => {
    if (token) {
      const today = new Date().toISOString().slice(0, 10);
      generateDocNos(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load draft from URL param
  useEffect(() => {
    if (!draftId || !token) return;
    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/trade-documents/${draftId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.data?.doc_data) {
          setFormData(json.data.doc_data);
          setCurrentDraftId(json.data.id);
          setCurrentDraftTitle(json.data.title || '');
          setIsEditing(false); // read-only until user clicks edit
        }
      } catch { /* ignore */ }
    };
    loadDraft();
  }, [draftId, token]);

  // Reset form when navigating without a draft ID (new draft)
  useEffect(() => {
    if (!draftId && token) {
      setFormData(emptyFormData());
      setCurrentDraftId(null);
      setCurrentDraftTitle('');
      setSaveTitle('');
      setIsEditing(true);
    }
  }, [draftId, token]);

  // Derived preview data
  const invoiceData = useMemo(() => buildInvoiceData(formData), [formData]);
  const packingListData = useMemo(() => buildPackingListData(formData), [formData]);
  const contractData = useMemo(() => buildContractData(formData), [formData]);

  // ── Vehicle helpers ──
  const updateVehicle = useCallback((idx: number, field: keyof TradeDocumentsFormVehicle, value: string | number) => {
    setFormData((prev) => {
      const vehicles = [...prev.vehicles];
      const updated = { ...vehicles[idx], [field]: value };
      if (field === 'unitPrice' || field === 'quantity') {
        updated.totalPrice = updated.unitPrice * updated.quantity;
      }
      vehicles[idx] = updated;
      return { ...prev, vehicles };
    });
  }, []);

  const addVehicle = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, { ...EMPTY_VEHICLE }],
    }));
  }, []);

  // ── VIN autocomplete ──
  const [vinSuggestions, setVinSuggestions] = useState<Record<number, VinSuggestion[]>>({});
  const [vinSearchingIdx, setVinSearchingIdx] = useState<number | null>(null);
  const [vinDropdownIdx, setVinDropdownIdx] = useState<number | null>(null);
  const [vinLookupIdx, setVinLookupIdx] = useState<number | null>(null);
  const vinSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVinSearch = useCallback((idx: number, q: string) => {
    if (vinSearchTimer.current) clearTimeout(vinSearchTimer.current);
    if (!q || q.length < 3) {
      setVinSuggestions((prev) => ({ ...prev, [idx]: [] }));
      return;
    }
    vinSearchTimer.current = setTimeout(async () => {
      setVinSearchingIdx(idx);
      const results = await searchVehicleArchives(token, q, 6);
      setVinSuggestions((prev) => ({ ...prev, [idx]: results }));
      setVinSearchingIdx(null);
      if (results.length > 0) setVinDropdownIdx(idx);
    }, 300);
  }, [token]);

  const handleVinSelect = useCallback(async (idx: number, suggestion: VinSuggestion) => {
    setVinDropdownIdx(null);
    setVinSuggestions((prev) => ({ ...prev, [idx]: [] }));
    // Update VIN first
    setFormData((prev) => {
      const vehicles = [...prev.vehicles];
      vehicles[idx] = { ...vehicles[idx], vin: suggestion.vin };
      return { ...prev, vehicles };
    });
    // Fetch vehicle data from archive via VIN lookup
    setVinLookupIdx(idx);
    try {
      const result = await lookupByVin(suggestion.vin);
      if (result._fromArchive) {
        setFormData((prev) => {
          const vehicles = [...prev.vehicles];
          const updated = { ...vehicles[idx] };
          if (result.brand) updated.brand = String(result.brand);
          if (result.brandEn) updated.brandEn = String(result.brandEn);
          if (result.model) updated.model = String(result.model);
          if (result.energyType) updated.energyType = String(result.energyType);
          if (result.power) updated.power = String(result.power);
          if (result.netWeight) updated.netWeight = String(result.netWeight);
          if (result.grossWeight) updated.grossWeight = String(result.grossWeight);
          vehicles[idx] = updated;
          return { ...prev, vehicles };
        });
        const filledFields = ['brand', 'brandEn', 'model', 'energyType', 'power', 'netWeight', 'grossWeight']
          .filter((k) => result[k] !== undefined && result[k] !== null && result[k] !== '')
          .length;
        toast.success(`已从车辆档案填充 ${filledFields} 个字段`);
      }
    } catch {
      toast.error('获取车辆详情失败');
    } finally {
      setVinLookupIdx(null);
    }
  }, [token, lookupByVin]);

  const removeVehicle = useCallback((idx: number) => {
    setFormData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== idx),
    }));
  }, []);

  // ── Save (create or update) ──
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const title = saveTitle || `草稿 ${new Date().toLocaleString('zh-CN')}`;
      let res: Response;
      if (currentDraftId) {
        // Update existing draft
        res = await fetch(`/api/trade-documents/${currentDraftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, doc_data: formData, doc_type: activeTab }),
        });
      } else {
        // Create new draft
        res = await fetch('/api/trade-documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            doc_data: formData,
            doc_type: activeTab === 'all' ? 'trade' : activeTab,
          }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失败');
      if (json.data?.id) setCurrentDraftId(json.data.id);
      setSaveMsg(currentDraftId ? '已更新！' : '保存成功！');
      setShowSaveDialog(false);
      setSaveTitle('');
      // Refresh draft list
      loadSavedDocs();
    } catch (e) {
      setSaveMsg(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [token, formData, saveTitle, user, currentDraftId, loadSavedDocs]);

  const handleLoadDoc = useCallback((doc: SavedDocument) => {
    if (doc.doc_data) {
      setFormData(doc.doc_data);
      setCurrentDraftId(doc.id);
      setCurrentDraftTitle(doc.title || '');
      setSaveTitle(doc.title || '');
      setIsEditing(false); // 默认只读
    }
    setShowLoadDialog(false);
  }, []);

  // ── Rename draft (inline) ──
  const handleStartRename = useCallback((doc: SavedDocument) => {
    setEditingId(doc.id);
    setEditingTitle(doc.title || '');
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!editingId || !editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/trade-documents/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '更新失败');
      }
      setSavedDocs((prev) =>
        prev.map((d) => (d.id === editingId ? { ...d, title: editingTitle.trim() } : d))
      );
      if (currentDraftId === editingId) { setSaveTitle(editingTitle.trim()); setCurrentDraftTitle(editingTitle.trim()); }
      toast.success('备注已更新');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setEditingId(null);
      setEditingTitle('');
    }
  }, [editingId, editingTitle, token, currentDraftId]);

  // ── Delete draft ──
  const handleDeleteDraft = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trade-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '删除失败');
      }
      setSavedDocs((prev) => prev.filter((d) => d.id !== id));
      if (currentDraftId === id) {
        setCurrentDraftId(null);
        setCurrentDraftTitle('');
        setSaveTitle('');
        setIsEditing(true);
      }
      toast.success('草稿已删除');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }, [token, currentDraftId]);

  // ── Print ──
  const handlePrint = useCallback(() => {
    if (activeTab === 'all') {
      // Collect all three preview elements
      const ids = ['invoice-preview', 'packing-list-preview', 'contract-preview'];
      const els = ids.map(id => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
      if (els.length === 0) return;
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((s) => s.outerHTML)
        .join('\n');
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>ExportDrive Documents</title>${styles}
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          @media print {
            body { background: white !important; margin: 0 !important; padding: 0 !important; display: block !important; }
            .doc-page { width: auto !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; page-break-after: always; break-after: page; }
            .doc-page:last-child { page-break-after: auto; break-after: auto; }
          }
          body { margin: 0; display: flex; flex-direction: column; align-items: center; background: #f0f0f0; }
          .doc-page { margin-bottom: 20px; background: white; }
        </style>
        </head>
        <body>
          ${els.map(el => `<div class="doc-page">${el.outerHTML}</div>`).join('\n')}
        </body>
        </html>
      `);
      win.document.close();
      setTimeout(() => win.print(), 500);
    } else {
      const previewId = activeTab === 'invoice' ? 'invoice-preview' : activeTab === 'packing-list' ? 'packing-list-preview' : 'contract-preview';
      const el = document.getElementById(previewId);
      if (!el) return;
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((s) => s.outerHTML)
        .join('\n');
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Print</title>${styles}
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          @media print {
            body { background: white !important; margin: 0 !important; padding: 0 !important; display: block !important; }
            #print-root { width: auto !important; min-height: auto !important; margin: 0 !important; }
          }
        </style>
        </head>
        <body style="margin:0;display:flex;justify-content:center;">
          <div id="print-root">${el.outerHTML}</div>
        </body>
        </html>
      `);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }, [activeTab]);

  // ── Company profile picker for seller ──
  const handlePickSeller = useCallback((info: CompanyInfo) => {
    setFormData((prev) => ({ ...prev, seller: { ...info } }));
  }, []);

  const handlePickBuyer = useCallback((profile: BuyerProfile) => {
    setFormData((prev) => ({
      ...prev,
      buyer: { ...prev.buyer, name: profile.buyerName, nameEn: profile.buyerNameEn || '', address: profile.address || '', addressEn: profile.addressEn || '', country: profile.country || '', countryEn: profile.countryEn || '', tel: profile.phone || '', email: profile.email || '' },
    }));
  }, []);

  const buyerProfileCurrent = useMemo((): BuyerProfile => ({
    id: '',
    buyerName: formData.buyer.name,
    buyerNameEn: formData.buyer.nameEn,
    address: formData.buyer.address,
    addressEn: formData.buyer.addressEn,
    country: formData.buyer.country,
    countryEn: formData.buyer.countryEn,
    phone: formData.buyer.tel,
    email: formData.buyer.email,
  }), [formData.buyer]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const handleMouseMove = (e: MouseEvent) => {
      setFormWidth(Math.max(360, Math.min(800, e.clientX)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        请先登录
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">
            {activeTab === 'all' ? '新建发票合同装箱单' : activeTab === 'invoice' ? '新建发票' : activeTab === 'packing-list' ? '新建装箱单' : activeTab === 'contract' ? '新建合同' : '新建单证'}
          </h1>
          {currentDraftId && currentDraftTitle && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono truncate max-w-48" title={currentDraftTitle}>
              {currentDraftTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs px-2 py-1 rounded ${saveMsg.includes('失败') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {saveMsg}
            </span>
          )}
          {currentDraftId && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className={`px-3 py-1.5 text-xs ${TYPE_THEME[activeTab].button} rounded-md hover:opacity-90 transition-opacity`}
            >
              编辑
            </button>
          )}
          {currentDraftId && isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
            >
              取消编辑
            </button>
          )}
          <button
            onClick={() => { setShowLoadDialog(true); loadSavedDocs(); }}
            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
          >
            加载草稿
          </button>
          {isEditing && (
            <button
              onClick={() => { setShowSaveDialog(true); if (currentDraftId) setSaveTitle(currentDraftTitle); }}
              disabled={saving}
              className={`px-3 py-1.5 text-xs ${TYPE_THEME[activeTab].button} rounded-md hover:opacity-90 transition-opacity disabled:opacity-50`}
            >
              {saving ? '保存中...' : currentDraftId ? '更新草稿' : '保存草稿'}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
          >
            {activeTab === 'all' ? '下载三份 (PDF)' : '打印'}
          </button>
          {activeTab !== 'all' && (
            <button
              onClick={() => setActiveTab('all')}
              className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
            >
              预览三份
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content: Form + Preview ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Form ── */}
        <div className="shrink-0 overflow-y-auto border-r bg-background" style={{ width: formWidth }}>
          <div className={`p-4 space-y-5 ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}>

            {/* ============ 01 SELLER / BUYER / CONSIGNEE ============ */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${TYPE_THEME[activeTab].badge} text-xs font-bold`}>01</span>
                <h2 className="text-sm font-semibold text-foreground">Seller / Buyer / Consignee</h2>
              </div>

              {/* ── Seller ── */}
              <div className="mb-3 p-3 border border-border rounded-lg bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Seller / 卖方</span>
                  <CompanyProfilePicker
                    current={formData.seller}
                    onPick={handlePickSeller}
                    label="企业档案"
                    size="xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">中文公司名称</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={formData.seller.name}
                      onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, name: e.target.value } }))}
                      placeholder="卖方中文公司名称"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Company Name (English)</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={formData.seller.nameEn}
                      onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, nameEn: e.target.value } }))}
                      placeholder="Seller company name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Country / 国家</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.seller.country} onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, country: e.target.value } }))} placeholder="China" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Contact / 联系人</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.seller.contact} onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, contact: e.target.value } }))} placeholder="Contact person" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Phone / 电话</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.seller.phone} onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, phone: e.target.value } }))} placeholder="+86..." />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Email</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.seller.email} onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, email: e.target.value } }))} placeholder="seller@example.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Address / 地址</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.seller.addressEn || formData.seller.address} onChange={(e) => setFormData((p) => ({ ...p, seller: { ...p.seller, addressEn: e.target.value } }))} placeholder="Seller address / 卖方地址" />
                  </div>
                </div>
              </div>

              {/* ── Buyer ── */}
              <div className="mb-3 p-3 border border-border rounded-lg bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Buyer / 买方</span>
                  <BuyerProfilePicker current={buyerProfileCurrent} onPick={handlePickBuyer} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Buyer company *</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.buyer.nameEn} onChange={(e) => setFormData((p) => ({ ...p, buyer: { ...p.buyer, nameEn: e.target.value } }))} placeholder="Buyer company name" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Buyer address *</label>
                    <textarea rows={2} className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={formData.buyer.addressEn} onChange={(e) => setFormData((p) => ({ ...p, buyer: { ...p.buyer, addressEn: e.target.value } }))} placeholder="Buyer address" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Telephone</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.buyer.tel} onChange={(e) => setFormData((p) => ({ ...p, buyer: { ...p.buyer, tel: e.target.value } }))} placeholder="+971..." />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Destination country *</label>
                    <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.buyer.countryEn} onChange={(e) => setFormData((p) => ({ ...p, buyer: { ...p.buyer, countryEn: e.target.value } }))} placeholder="e.g. UAE" />
                  </div>
                </div>
              </div>

              {/* ── Consignee ── */}
              <div className="p-3 border border-border rounded-lg bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Consignee / 收货人</span>
                </div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={formData.sameAsBuyer} onChange={(e) => setFormData((p) => ({ ...p, sameAsBuyer: e.target.checked }))} className="w-3.5 h-3.5 rounded border-border accent-primary" />
                  <span className="text-xs text-muted-foreground">Consignee same as buyer</span>
                </label>

                {!formData.sameAsBuyer && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Consignee company</label>
                      <input className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.consignee.nameEn} onChange={(e) => setFormData((p) => ({ ...p, consignee: { ...p.consignee, nameEn: e.target.value } }))} placeholder="Consignee company name" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Consignee address</label>
                      <textarea rows={2} className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={formData.consignee.addressEn} onChange={(e) => setFormData((p) => ({ ...p, consignee: { ...p.consignee, addressEn: e.target.value } }))} placeholder="Consignee address" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ============ 02 ORDER & SHIPPING ============ */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${TYPE_THEME[activeTab].badge} text-xs font-bold`}>02</span>
                <h2 className="text-sm font-semibold text-foreground">Order & Shipping / 订单与运输</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Document date *</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.invoiceDate}
                    onChange={async (e) => {
                      const d = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        tradeInfo: {
                          ...p.tradeInfo,
                          invoiceDate: d,
                          signDate: d,
                          plDate: d,
                          invoiceNo: 'INV' + d.replace(/-/g, '') + '-...',
                          contractNo: 'CON' + d.replace(/-/g, '') + '-...',
                          plNo: 'PL' + d.replace(/-/g, '') + '-...',
                        },
                      }));
                      if (d) generateDocNos(d);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Invoice No. / 发票号</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    value={formData.tradeInfo.invoiceNo}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, invoiceNo: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Contract No. / 合同号</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    value={formData.tradeInfo.contractNo}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, contractNo: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">PL No. / 装箱单号</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    value={formData.tradeInfo.plNo}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, plNo: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Currency *</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.currency}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, currency: e.target.value } }))}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Incoterm *</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.tradeTerm}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, tradeTerm: e.target.value } }))}
                  >
                    {INCOTERMS.map((it) => (
                      <option key={it} value={it}>{it}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">
                    {formData.tradeInfo.tradeTerm === 'FOB' ? 'Port of shipment *' :
                     formData.tradeInfo.tradeTerm === 'CIF' ? 'Port of destination *' :
                     'Place of delivery *'}
                  </label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.tradePlace}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, tradePlace: e.target.value } }))}
                    placeholder="Guangzhou, China"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Loading port</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.loadingPort}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, loadingPort: e.target.value } }))}
                    placeholder="Nansha Port, China"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Destination / port *</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.destination}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, destination: e.target.value } }))}
                    placeholder="Jebel Ali"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Latest loading date *</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.latestLoadingDate}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, latestLoadingDate: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Payment terms</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.paymentTerms}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, paymentTerms: e.target.value } }))}
                  >
                    {PAYMENT_TERMS_OPTIONS.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Amount tolerance</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.tolerance}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, tolerance: e.target.value } }))}
                  >
                    {TOLERANCE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Signed at</label>
                  <input
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formData.tradeInfo.signPlace}
                    onChange={(e) => setFormData((p) => ({ ...p, tradeInfo: { ...p.tradeInfo, signPlace: e.target.value } }))}
                    placeholder="Tianjin"
                  />
                </div>
              </div>
            </section>

            {/* ============ 03 VEHICLE LIST ============ */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${TYPE_THEME[activeTab].badge} text-xs font-bold`}>03</span>
                  <h2 className="text-sm font-semibold text-foreground">Vehicle List / 车辆清单</h2>
                </div>
                <button
                  onClick={addVehicle}
                  className="px-2.5 py-1 text-xs border border-border rounded-md hover:bg-muted transition-colors"
                >
                  + Add Row
                </button>
              </div>

              {/* Vehicle table header */}
              <div className="grid grid-cols-12 gap-1 mb-1 px-1">
                {['#', 'Condition', 'Brand', 'Model', 'VIN', 'Energy', 'Power', 'Body', 'Qty', 'Price', 'N.Wt', 'G.Wt', 'Pkgs', 'Marks', 'Remarks'].map((h) => (
                  <div key={h} className="text-[10px] text-muted-foreground font-medium truncate">{h}</div>
                ))}
              </div>

              {/* Vehicle cards */}
              <div className="space-y-3">
                {formData.vehicles.map((v, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {v.brand ? `${v.brand} ${v.model || ''}` : 'New vehicle'}
                        </span>
                      </div>
                      {formData.vehicles.length > 1 && (
                        <button
                          onClick={() => removeVehicle(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                          title="Remove vehicle"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Condition (Used/New)</label>
                        <select className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.condition} onChange={(e) => updateVehicle(idx, 'condition', e.target.value)}>
                          <option value="Used">Used</option>
                          <option value="New">New</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Brand (CN)</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.brand} onChange={(e) => updateVehicle(idx, 'brand', e.target.value)} placeholder="比亚迪" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Brand (EN)</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.brandEn} onChange={(e) => updateVehicle(idx, 'brandEn', e.target.value)} placeholder="BYD" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Model</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.model} onChange={(e) => updateVehicle(idx, 'model', e.target.value)} placeholder="Song Plus" />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">VIN (17)</label>
                        <div className="flex items-center gap-0.5">
                          <input className="flex-1 px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono" value={v.vin} onChange={(e) => { const val = e.target.value.toUpperCase().slice(0, 17); updateVehicle(idx, 'vin', val); handleVinSearch(idx, val); }} onFocus={() => { if (v.vin.length >= 3 && vinSuggestions[idx]?.length > 0) setVinDropdownIdx(idx); }} onBlur={() => { setTimeout(() => setVinDropdownIdx(null), 200); }} placeholder="输入VIN自动联想" maxLength={17} />
                          {vinLookupLoading && vinLookupIdx === idx ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
                        </div>
                        {vinDropdownIdx === idx && vinSuggestions[idx]?.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-0.5 bg-popover border border-border rounded shadow-lg max-h-40 overflow-y-auto">
                            {vinSuggestions[idx].map((s) => (
                              <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); handleVinSelect(idx, s); }} className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                                <span className="font-mono font-medium">{s.vin}</span>
                                {s.brand && s.model && <span className="text-muted-foreground ml-1.5">{s.brand} {s.model}</span>}
                                {s.fuelType && <span className="text-muted-foreground/60 ml-1">· {s.fuelType}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {vinSearchingIdx === idx && <div className="absolute z-20 left-0 right-0 mt-0.5 bg-popover border border-border rounded shadow-lg px-2 py-1.5 text-[11px] text-muted-foreground">搜索中...</div>}
                        <span className={`text-[9px] ${v.vin.length === 17 ? 'text-green-600' : v.vin.length > 0 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>{v.vin.length}/17</span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Energy</label>
                        <select className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.energyType} onChange={(e) => updateVehicle(idx, 'energyType', e.target.value)}>
                          {ENERGY_TYPES.map((et) => (<option key={et.en} value={et.en}>{et.en}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Power (kW) <span className="text-muted-foreground/40">opt.</span></label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.power} onChange={(e) => updateVehicle(idx, 'power', e.target.value)} placeholder="150" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Body</label>
                        <select className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.bodyType} onChange={(e) => updateVehicle(idx, 'bodyType', e.target.value)}>
                          {BODY_TYPES.map((bt) => (<option key={bt.en} value={bt.en}>{bt.en}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Qty</label>
                        <input type="number" className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.quantity} onChange={(e) => updateVehicle(idx, 'quantity', Math.max(1, Number(e.target.value)))} min={1} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Price</label>
                        <input type="number" className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.unitPrice || ''} onChange={(e) => updateVehicle(idx, 'unitPrice', Number(e.target.value))} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">N.Wt (kg)</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.netWeight} onChange={(e) => updateVehicle(idx, 'netWeight', e.target.value)} placeholder="kg" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">G.Wt (kg)</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.grossWeight} onChange={(e) => updateVehicle(idx, 'grossWeight', e.target.value)} placeholder="kg" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Pkgs</label>
                        <input type="number" className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.packages} onChange={(e) => updateVehicle(idx, 'packages', Math.max(1, Number(e.target.value)))} min={1} />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Marks</label>
                        <input className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" value={v.marks} onChange={(e) => updateVehicle(idx, 'marks', e.target.value)} placeholder="N/M" />
                      </div>
                      <div className="col-span-5">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Remarks / 备注 <span className="text-muted-foreground/40">选填，支持多行与空行，展示在发票与合同明细中</span></label>
                        <textarea rows={3} className="w-full px-1.5 py-1 text-[11px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y leading-relaxed" value={v.remarks ?? ''} onChange={(e) => updateVehicle(idx, 'remarks', e.target.value)} placeholder={"如：车辆特殊配置、交付约定等备注信息\n支持换行与空行"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                <p>Total Qty: {formData.vehicles.reduce((s, v) => s + v.quantity, 0)}</p>
                <p>Total Amount: {formData.tradeInfo.currency} {formData.vehicles.reduce((s, v) => s + v.unitPrice * v.quantity, 0).toLocaleString()}</p>
                <p>Total Pkgs: {formData.vehicles.reduce((s, v) => s + (v.packages || 1), 0)}</p>
              </div>
            </section>

          </div>
        </div>

        {/* ── Resize Handle ── */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 transition-colors ${isDragging ? 'bg-primary/50' : 'bg-transparent'}`}
          style={{ userSelect: 'none' }}
        />

        {/* ── Right: Preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          <div className="flex items-center border-b bg-card shrink-0">
            {([
              { key: 'all' as const, label: '全部三份', color: 'border-primary text-primary' },
              { key: 'invoice' as const, label: 'Invoice / 商业发票', color: 'border-amber-500 text-amber-600 dark:text-amber-400' },
              { key: 'packing-list' as const, label: 'Packing List / 装箱单', color: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
              { key: 'contract' as const, label: 'Contract / 出口合同', color: 'border-sky-600 text-sky-700 dark:text-sky-400' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? tab.color
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col items-center gap-6">
            {activeTab === 'all' && (
              <>
                <div className="shadow-lg bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                  <InvoicePreview data={invoiceData} id="invoice-preview" />
                </div>
                <div className="shadow-lg bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                  <PackingListPreview data={packingListData} id="packing-list-preview" />
                </div>
                <div className="shadow-lg bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                  <ContractPreview data={contractData} id="contract-preview" />
                </div>
              </>
            )}
            {activeTab !== 'all' && (
              <div className="shadow-lg bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                {activeTab === 'invoice' && <InvoicePreview data={invoiceData} id="invoice-preview" />}
                {activeTab === 'packing-list' && <PackingListPreview data={packingListData} id="packing-list-preview" />}
                {activeTab === 'contract' && <ContractPreview data={contractData} id="contract-preview" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Save Dialog ── */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">{currentDraftId ? '更新草稿' : '保存草稿'}</h3>
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              placeholder="草稿备注（可选）"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-1.5 text-xs border border-border rounded-md hover:bg-muted">取消</button>
              <button onClick={handleSave} disabled={saving} className={`px-4 py-1.5 text-xs ${TYPE_THEME[activeTab].button} rounded-md hover:opacity-90 disabled:opacity-50`}>
                {saving ? '保存中...' : currentDraftId ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Load Dialog ── */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLoadDialog(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-[28rem] max-h-[70vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">加载草稿</h3>
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : savedDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无保存的草稿</p>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-1">
                {savedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`group flex items-center gap-1 px-3 py-2 rounded-md hover:bg-muted transition-colors ${currentDraftId === doc.id ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                  >
                    {editingId === doc.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          className="flex-1 min-w-0 px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={editingTitle}
                          autoFocus
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') { setEditingId(null); setEditingTitle(''); }
                          }}
                        />
                        <button
                          onClick={handleConfirmRename}
                          className="p-1 rounded hover:bg-primary/10 text-primary shrink-0"
                          title="确认"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditingTitle(''); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground shrink-0"
                          title="取消"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLoadDoc(doc)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-sm font-medium truncate">
                            {doc.title || '未命名草稿'}
                            {currentDraftId === doc.id && (
                              <span className="ml-1.5 text-[10px] text-primary font-normal">(当前)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(doc.updated_at).toLocaleString('zh-CN')}</p>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartRename(doc)}
                            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                            title="修改备注"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`确定删除草稿"${doc.title || '未命名草稿'}"吗？`)) {
                                handleDeleteDraft(doc.id);
                              }
                            }}
                            disabled={deletingId === doc.id}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                            title="删除"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3 pt-3 border-t">
              <button onClick={() => setShowLoadDialog(false)} className="px-4 py-1.5 text-xs border border-border rounded-md hover:bg-muted">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}