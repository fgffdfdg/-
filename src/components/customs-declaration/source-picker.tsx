'use client';

import * as React from 'react';
import { Search, Check, ChevronsUpDown, FileText, ShieldCheck, X, Sparkles, AlertTriangle, Package, ExternalLink } from 'lucide-react';
import { SectionCard, FieldLabel, fieldInputClass } from './section-card';
import type { CustomsDeclarationFull, DeclarationGoodsItem } from '@/lib/customs-declaration/types';
import { newGoodsItem } from '@/lib/customs-declaration/types';
import { COUNTRIES, findByCode } from '@/lib/customs-codes';

// ---- 数据源类型 ----

interface ContractOption {
  id: string;
  contractNo: string;
  invoiceNo: string | null;
  packingListNo: string | null;
  vins: string[];
  notes: string | null;
}

interface LicenseOption {
  id: string;
  licenseNo: string;
  exporter: string;
  country: string;
  contractNo?: string;
  vins?: string[];
  brand?: string;
  model?: string;
  vehicleCount?: number;
  totalAmount?: number;
  issueDate?: string;
}

// ---- 获取 Auth Token ----

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

// ---- 搜索选择器通用组件 ----

interface ComboSelectProps<T> {
  items: T[];
  loading: boolean;
  search: string;
  onSearch: (val: string) => void;
  onSelect: (item: T) => void;
  onClear: () => void;
  onCustomInput?: (val: string) => void;
  renderLabel: (item: T) => string;
  renderDesc: (item: T) => string;
  placeholder: string;
  emptyText: string;
  selectedLabel?: string;
  leftIcon: React.ReactNode;
  /** 选中后跳转链接（可选），如 /contract-documents?search=XXX */
  navUrl?: string;
}

function ComboSelect<T>({
  items,
  loading,
  search,
  onSearch,
  onSelect,
  onClear,
  onCustomInput,
  renderLabel,
  renderDesc,
  placeholder,
  emptyText,
  selectedLabel,
  leftIcon,
  navUrl,
}: ComboSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
        className={`${fieldInputClass} flex items-center gap-2 cursor-pointer ${
          selectedLabel ? 'text-on-surface' : 'text-on-surface-variant/50'
        }`}
      >
        <span className="text-on-surface-variant/60 shrink-0">{leftIcon}</span>
        <span className="flex-1 truncate">{selectedLabel || placeholder}</span>
        {selectedLabel && navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 hover:bg-surface-container rounded p-0.5 text-accent hover:text-accent/80"
            title="跳转到源单证"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {selectedLabel ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 hover:bg-surface-container rounded p-0.5"
            title="清除选择"
          >
            <X className="w-3.5 h-3.5 text-on-surface-variant/60" />
          </button>
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              placeholder="输入关键词搜索..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-on-surface-variant/60">加载中...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-3">
                <div className="text-xs text-on-surface-variant/60 mb-1">{emptyText}</div>
                {onCustomInput && search.trim() && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-md bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-colors flex items-center gap-2"
                    onClick={() => {
                      onCustomInput(search.trim());
                      setOpen(false);
                      onSearch('');
                    }}
                  >
                    <span className="text-accent text-xs">手动输入「{search.trim()}」</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {items.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-container transition-colors flex items-start gap-3"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <span className="text-on-surface-variant/40 mt-0.5 shrink-0">{leftIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-on-surface truncate">{renderLabel(item)}</div>
                      <div className="text-[11px] text-on-surface-variant/60 truncate">{renderDesc(item)}</div>
                    </div>
                  </button>
                ))}
                {onCustomInput && search.trim() && (
                  <div className="border-t border-border px-3 py-2">
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded bg-accent/10 hover:bg-accent/15 transition-colors"
                      onClick={() => {
                        onCustomInput(search.trim());
                        setOpen(false);
                        onSearch('');
                      }}
                    >
                      <span className="text-xs text-accent">手动输入「{search.trim()}」</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 主组件 ----

interface Props {
  value: CustomsDeclarationFull;
  onChange: (next: CustomsDeclarationFull) => void;
  contractNo: string;
  licenseNo: string;
  onAutoFill: (patch: Partial<CustomsDeclarationFull>, goods?: DeclarationGoodsItem[], source?: string) => void;
}

export function SourcePicker({ value, onChange, contractNo, licenseNo, onAutoFill }: Props) {
  const [contracts, setContracts] = React.useState<ContractOption[]>([]);
  const [licenses, setLicenses] = React.useState<LicenseOption[]>([]);
  const [loadingContracts, setLoadingContracts] = React.useState(false);
  const [loadingLicenses, setLoadingLicenses] = React.useState(false);
  const [contractSearch, setContractSearch] = React.useState('');
  const [licenseSearch, setLicenseSearch] = React.useState('');
  const [selectedContract, setSelectedContract] = React.useState<ContractOption | null>(null);
  const [selectedLicense, setSelectedLicense] = React.useState<LicenseOption | null>(null);
  const [autoFillNote, setAutoFillNote] = React.useState<string | null>(null);
  const [conflictNote, setConflictNote] = React.useState<string | null>(null);
  // 记录字段由哪个来源填充，用于冲突检测
  const filledBy = React.useRef<Record<string, 'contract' | 'license'>>({});

  const fieldLabels: Record<string, string> = {
    contractNo: '合同协议号',
    'consignor.name': '境内发货人',
    arrivalCountryCode: '运抵国',
    declareDate: '申报日期',
    licenseNo: '许可证号',
  };

  // 加载合同列表
  const loadContracts = React.useCallback(async () => {
    setLoadingContracts(true);
    try {
      const token = getAccessToken();
      const url = new URL('/api/contract-documents', window.location.origin);
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setContracts((json.data ?? []) as ContractOption[]);
      }
    } catch {
      // 静默失败
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  // 加载许可证草单列表
  const loadLicenses = React.useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/license-drafts', {
        headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {},
      });

      const allLicenses: LicenseOption[] = [];

      if (res.ok) {
        const dJson = await res.json();
        for (const d of (dJson.data ?? []) as Array<Record<string, unknown>>) {
          allLicenses.push({
            id: `draft-${d.id}`,
            licenseNo: String(d.no ?? ''),
            exporter: String(d.exporter ?? ''),
            country: String(d.country ?? ''),
            contractNo: (d.contractNo as string) || undefined,
            vins: (d.vins as string[]) || undefined,
            brand: (d.brand as string) || undefined,
            model: (d.model as string) || undefined,
            vehicleCount: (d.vehicleCount as number) || undefined,
            totalAmount: (d.totalAmount as number) || undefined,
          });
        }
      }

      setLicenses(allLicenses);
    } catch {
      // 静默失败
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  React.useEffect(() => {
    loadContracts();
    loadLicenses();
  }, [loadContracts, loadLicenses]);

  // 过滤
  const filteredContracts = contractSearch
    ? contracts.filter(
        (c) =>
          c.contractNo.toLowerCase().includes(contractSearch.toLowerCase()) ||
          (c.invoiceNo ?? '').toLowerCase().includes(contractSearch.toLowerCase()) ||
          c.vins.some((v) => v.includes(contractSearch.toUpperCase())),
      )
    : contracts;

  const filteredLicenses = licenseSearch
    ? licenses.filter(
        (l) =>
          l.licenseNo.toLowerCase().includes(licenseSearch.toLowerCase()) ||
          l.exporter.toLowerCase().includes(licenseSearch.toLowerCase()) ||
          (l.country ?? '').includes(licenseSearch),
      )
    : licenses;

  // 查找国家代码
  const findCountryCode = (name: string): string => {
    const found = COUNTRIES.find(
      (c) => c.name === name || c.code === name,
    );
    return found?.code ?? '';
  };

  // 选择合同 → 自动填充
  const handleSelectContract = (c: ContractOption) => {
    setSelectedContract(c);
    setConflictNote(null);
    const conflicts: string[] = [];
    const patch: Partial<CustomsDeclarationFull> = {};
    const filled: string[] = [];

    // 合同号
    const contractField = 'contractNo';
    if (filledBy.current[contractField] && filledBy.current[contractField] !== 'contract' && value.contractNo && value.contractNo !== c.contractNo) {
      conflicts.push(`合同协议号：已有「${value.contractNo}」（来自${filledBy.current[contractField] === 'license' ? '许可证' : '其他'}），合同覆盖为「${c.contractNo}」`);
    }
    patch.contractNo = c.contractNo;
    filledBy.current[contractField] = 'contract';
    filled.push('合同协议号');

    // 收集所有 VIN（合同 + 装箱单联动）
    const allVins = [...c.vins];
    let packingListNote = '';
    if (c.packingListNo) {
      const packingDoc = contracts.find(
        (d) => d.packingListNo === c.packingListNo && d.id !== c.id,
      );
      if (packingDoc) {
        for (const v of packingDoc.vins) {
          if (!allVins.includes(v)) allVins.push(v);
        }
        packingListNote = ` + 装箱单「${c.packingListNo}」${packingDoc.vins.length}个VIN`;
      }
    }

    // 生成商品明细
    let newGoods: DeclarationGoodsItem[] | undefined;
    if (allVins.length > 0) {
      newGoods = allVins.map((vin, i) => newGoodsItem({
        itemNo: i + 1,
        goodsDescription: vin,
        vin,
      }));
      filled.push(`商品明细：${allVins.length}个VIN${packingListNote}（VIN 填入商品名称，请补全 HS 编码、价格等信息）`);
    }

    onChange({ ...value, ...patch });
    onAutoFill(patch, newGoods, `合同 ${c.contractNo}`);

    if (conflicts.length > 0) {
      setConflictNote(`⚠️ 字段冲突：${conflicts.join('；')}`);
      setAutoFillNote(`已从合同「${c.contractNo}」填充：${filled.join('、')}（有冲突，已覆盖）`);
    } else {
      setAutoFillNote(`已从合同「${c.contractNo}」自动填充：${filled.join('、')}`);
    }
  };

  const handleClearContract = () => {
    setSelectedContract(null);
    setAutoFillNote(null);
    setConflictNote(null);
  };

  // 选择许可证草单 → 自动填充
  const handleSelectLicense = (l: LicenseOption) => {
    setSelectedLicense(l);
    setConflictNote(null);
    const patch: Partial<CustomsDeclarationFull> = {};
    const conflicts: string[] = [];
    const filled: string[] = [];

    // 许可证号
    const licField = 'licenseNo';
    if (filledBy.current[licField] && filledBy.current[licField] !== 'license' && value.licenseNo && value.licenseNo !== l.licenseNo) {
      conflicts.push(`许可证号：已有「${value.licenseNo}」（来自${filledBy.current[licField] === 'contract' ? '合同' : '其他'}），许可证覆盖为「${l.licenseNo}」`);
    }
    patch.licenseNo = l.licenseNo;
    filledBy.current[licField] = 'license';
    filled.push('许可证号');

    // 发货人
    const consignorField = 'consignor.name';
    if (l.exporter) {
      if (value.consignor.name && value.consignor.name !== l.exporter && filledBy.current[consignorField] && filledBy.current[consignorField] !== 'license') {
        conflicts.push(`境内发货人：已有「${value.consignor.name}」，许可证为「${l.exporter}」（未覆盖，保留原值）`);
      } else if (!value.consignor.name) {
        patch.consignor = { ...value.consignor, name: l.exporter };
        filledBy.current[consignorField] = 'license';
        filled.push('境内发货人');
      }
    }

    // 运抵国
    const countryField = 'arrivalCountryCode';
    const countryCode = findCountryCode(l.country);
    if (l.country && countryCode) {
      if (value.arrivalCountryCode && value.arrivalCountryCode !== countryCode && filledBy.current[countryField] && filledBy.current[countryField] !== 'license') {
        conflicts.push(`运抵国：已有「${value.arrivalCountryName || value.arrivalCountryCode}」，许可证为「${l.country}」（未覆盖，保留原值）`);
      } else if (!value.arrivalCountryCode) {
        patch.arrivalCountryCode = countryCode;
        patch.arrivalCountryName = l.country;
        filledBy.current[countryField] = 'license';
        filled.push('运抵国');
      }
    }

    // 合同号（从许可证关联）
    const contractField = 'contractNo';
    if (l.contractNo && !value.contractNo && !selectedContract) {
      patch.contractNo = l.contractNo;
      filledBy.current[contractField] = 'license';
      filled.push('合同协议号');
    } else if (l.contractNo && value.contractNo && value.contractNo !== l.contractNo) {
      conflicts.push(`合同协议号：已有「${value.contractNo}」（${filledBy.current[contractField] === 'contract' ? '来自合同选择' : '手动输入'}），许可证关联「${l.contractNo}」（未覆盖）`);
    }

    // 签发日期
    const dateField = 'declareDate';
    if (l.issueDate && !value.declareDate) {
      patch.declareDate = l.issueDate;
      filledBy.current[dateField] = 'license';
      filled.push('申报日期');
    }

    onChange({ ...value, ...patch });
    onAutoFill(patch, undefined, `许可证 ${l.licenseNo}`);

    if (conflicts.length > 0) {
      setConflictNote(`⚠️ 字段冲突：${conflicts.join('；')}`);
    }
    setAutoFillNote(`已从许可证草单「${l.licenseNo}」自动填充：${filled.join('、')}${conflicts.length > 0 ? '（有冲突未覆盖）' : ''}`);
  };

  const handleClearLicense = () => {
    setSelectedLicense(null);
    setAutoFillNote(null);
    setConflictNote(null);
  };

  return (
    <SectionCard
      icon={<Sparkles className="w-4 h-4" />}
      title="关联单证（自动填充）"
      subtitle="选择合同归档与许可证草单，自动填写关联字段"
    >
      {autoFillNote && (
        <div className="mb-3 px-3 py-2 rounded-md bg-accent/10 border border-accent/20 text-xs text-accent flex items-center gap-2">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{autoFillNote}</span>
        </div>
      )}
      {conflictNote && (
        <div className="mb-3 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{conflictNote}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>合同协议号</FieldLabel>
          <ComboSelect<ContractOption>
            items={filteredContracts}
            loading={loadingContracts}
            search={contractSearch}
            onSearch={setContractSearch}
            onSelect={handleSelectContract}
            onClear={() => {
              handleClearContract();
              onChange({ ...value, contractNo: '' });
            }}
            onCustomInput={(val) => {
              setSelectedContract(null);
              setAutoFillNote(null);
              onChange({ ...value, contractNo: val });
            }}
            renderLabel={(c) => c.contractNo}
            renderDesc={(c) => {
              const parts: string[] = [];
              if (c.invoiceNo) parts.push(`发票: ${c.invoiceNo}`);
              if (c.vins.length > 0) parts.push(`${c.vins.length} VIN`);
              if (c.notes) parts.push(c.notes.slice(0, 30));
              return parts.join(' · ') || '暂无详情';
            }}
            placeholder="选择或输入合同号..."
            emptyText={contracts.length === 0 ? '暂无合同归档，可直接输入' : '无匹配合同，可手动输入'}
            selectedLabel={selectedContract?.contractNo || (value.contractNo && !selectedContract ? value.contractNo : undefined)}
            leftIcon={<FileText className="w-4 h-4" />}
            navUrl={
              (selectedContract?.contractNo || value.contractNo)
                ? `/contract-documents?search=${encodeURIComponent(selectedContract?.contractNo || value.contractNo)}`
                : undefined
            }
          />
        </div>

        <div>
          <FieldLabel>出口许可证号</FieldLabel>
          <ComboSelect<LicenseOption>
            items={filteredLicenses}
            loading={loadingLicenses}
            search={licenseSearch}
            onSearch={setLicenseSearch}
            onSelect={handleSelectLicense}
            onClear={() => {
              handleClearLicense();
              onChange({ ...value, licenseNo: '' });
            }}
            onCustomInput={(val) => {
              setSelectedLicense(null);
              setAutoFillNote(null);
              onChange({ ...value, licenseNo: val });
            }}
            renderLabel={(l) => l.licenseNo}
            renderDesc={(l) => {
              const parts: string[] = [];
              if (l.exporter) parts.push(l.exporter.slice(0, 20));
              if (l.country) parts.push(l.country);
              if (l.vehicleCount) parts.push(`${l.vehicleCount}辆`);
              return parts.join(' · ') || '暂无详情';
            }}
            placeholder="选择或输入许可证号..."
            emptyText={licenses.length === 0 ? '暂无许可证草单，可直接输入' : '无匹配草单，可手动输入'}
            selectedLabel={selectedLicense?.licenseNo || (value.licenseNo && !selectedLicense ? value.licenseNo : undefined)}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            navUrl={
              (selectedLicense?.licenseNo || value.licenseNo)
                ? `/export-license?search=${encodeURIComponent(selectedLicense?.licenseNo || value.licenseNo)}`
                : undefined
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}