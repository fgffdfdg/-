'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

/** 公司档案（来自 DB company_profiles 表） */
interface CompanyProfile {
  id: string;
  company_name: string;
  company_name_en?: string;
  social_credit_code?: string;
  key_no?: string;
  contact?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  address_en?: string;
  country?: string;
  notes?: string;
}

interface PartyFields {
  exporterName: string;
  exporterKeyNo: string;
  exporterCode: string;
  consignorName: string;
  consignorKeyNo: string;
  consignorCode: string;
}

interface Props {
  value: PartyFields;
  onPick: (fields: PartyFields) => void;
}

export default function LicensePartyPicker({ value, onPick }: Props) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // 保存到档案的对话框
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);

  // 加载公司档案列表
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company-profiles?limit=50');
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setProfiles(json.data ?? []);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // 从公司档案映射到 PartyFields
  const mapProfileToFields = (p: CompanyProfile): PartyFields => ({
    exporterName: p.company_name ?? '',
    exporterKeyNo: p.key_no ?? '',
    exporterCode: p.social_credit_code ?? '',
    consignorName: p.company_name ?? '',
    consignorKeyNo: p.key_no ?? '',
    consignorCode: p.social_credit_code ?? '',
  });

  const handlePick = (p: CompanyProfile) => {
    onPick(mapProfileToFields(p));
    toast.success(`已带入档案：${p.company_name}`);
  };

  // 保存为档案
  const openSaveDialog = () => {
    if (!value.exporterName.trim() && !value.consignorName.trim()) {
      toast.error('请先填写出口商或发货人名称，再保存档案');
      return;
    }
    setSaveName(value.exporterName.trim() || value.consignorName.trim());
    setSaveNote('');
    setSaveOpen(true);
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/company-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: value.exporterName.trim() || value.consignorName.trim(),
          social_credit_code: value.exporterCode || value.consignorCode || undefined,
          key_no: value.exporterKeyNo || value.consignorKeyNo || undefined,
          notes: saveNote || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '保存失败');
      }
      await fetchProfiles();
      setSaveOpen(false);
      toast.success('档案已保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const hasAnyValue =
    value.exporterName.trim() ||
    value.consignorName.trim() ||
    value.exporterCode.trim() ||
    value.consignorCode.trim();

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary"
            >
              <Building2 className="mr-1 h-3 w-3" />
              从企业档案选择
              {profiles.length > 0 && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium">
                  {profiles.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="end">
            <Command>
              <CommandInput placeholder="搜索企业名称 / 信用代码 / 备注…" />
              <CommandList>
                <CommandEmpty>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">加载中…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Building2 className="mb-2 h-6 w-6 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">
                        {profiles.length === 0
                          ? '还没有企业档案，先去用户中心创建'
                          : '没有匹配的企业'}
                      </p>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup heading="企业档案">
                  {profiles.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.company_name} ${p.social_credit_code ?? ''} ${p.notes ?? ''}`}
                      onSelect={() => handlePick(p)}
                      className="flex items-start gap-2.5 py-2.5"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {p.company_name}
                          </span>
                          {p.notes && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {p.notes}
                            </span>
                          )}
                        </div>
                        {(p.social_credit_code || p.key_no) && (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
                            {[p.social_credit_code, p.key_no].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        {p.address && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                            {p.address}
                          </p>
                        )}
                      </div>
                      <Check className="h-3.5 w-3.5 shrink-0 self-center text-primary opacity-0 group-data-[selected=true]:opacity-100" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary"
          onClick={openSaveDialog}
          disabled={!hasAnyValue}
        >
          <Save className="mr-1 h-3 w-3" />
          保存为企业档案
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              保存企业档案
            </DialogTitle>
            <DialogDescription>
              保存后可在所有单证中快速选择，无需重复填写。档案保存在云端，团队成员共享。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="party-name">企业名称</Label>
              <Input
                id="party-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例如：上海XX汽车贸易有限公司"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="party-note">
                备注 <span className="text-muted-foreground">(可选)</span>
              </Label>
              <Textarea
                id="party-note"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="例如：一般贸易专用、AEO 高级认证…"
                className="min-h-[64px] resize-none"
              />
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">将保存以下信息：</div>
              <div>企业名称：{value.exporterName || '—'}</div>
              <div>统一社会信用代码：{value.exporterCode || '—'}</div>
              <div>电子钥匙编号：{value.exporterKeyNo || '—'}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              保存档案
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}