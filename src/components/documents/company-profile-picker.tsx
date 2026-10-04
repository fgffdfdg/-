'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, Loader2, Pencil, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import type { CompanyInfo } from './types';

interface CompanyProfileRecord {
  id: string;
  company_name: string | null;
  company_name_en: string | null;
  social_credit_code: string | null;
  legal_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  address_en: string | null;
  notes: string | null;
  is_default: boolean | null;
}

interface Props {
  /** 当前编辑中的公司信息，保存时使用 */
  current: CompanyInfo;
  /** 选择某个档案后回调 */
  onPick: (info: CompanyInfo) => void;
  /** 触发按钮尺寸 */
  size?: 'sm' | 'xs';
  /** 按钮文案 */
  label?: string;
}

function profileToCompanyInfo(p: CompanyProfileRecord): CompanyInfo {
  return {
    name: p.company_name || '',
    nameEn: p.company_name_en || undefined,
    address: p.address || '',
    addressEn: p.address_en || undefined,
    country: 'China',
    countryEn: undefined,
    contact: p.legal_person || '',
    contactEn: undefined,
    phone: p.contact_phone || '',
    email: p.contact_email || '',
  };
}

function companyInfoToProfilePayload(c: CompanyInfo, notes?: string) {
  return {
    company_name: c.name || '',
    company_name_en: c.nameEn || c.name || '',
    address: c.address || '',
    address_en: c.addressEn || c.address || '',
    legal_person: c.contact || '',
    contact_phone: c.phone || '',
    contact_email: c.email || '',
    notes: notes ?? '',
  };
}

function isEmpty(info: CompanyInfo): boolean {
  return !info.name && !info.address && !info.contact && !info.phone && !info.email;
}

export default function CompanyProfilePicker({ current, onPick, size = 'sm', label = '一键选择' }: Props) {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<CompanyProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 保存/编辑弹窗
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompanyProfileRecord | null>(null);
  const [notesInput, setNotesInput] = useState('');

  const fetchProfiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/company-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '加载企业档案失败');
      }
      const j = await res.json();
      setProfiles(j.data || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载企业档案失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && user) {
      fetchProfiles();
    }
  }, [open, user, fetchProfiles]);

  const handlePick = (p: CompanyProfileRecord) => {
    onPick(profileToCompanyInfo(p));
    setOpen(false);
    toast.success(`已填入「${p.company_name_en || p.company_name || '未命名企业'}」`);
  };

  // 打开"保存当前信息"弹窗
  const openSaveDialog = () => {
    if (!user) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    if (isEmpty(current)) {
      toast.error('当前信息为空，请先填写再保存');
      return;
    }
    setEditingId(null);
    setEditForm({
      id: '',
      company_name: current.name || '',
      company_name_en: current.nameEn || current.name || '',
      social_credit_code: '',
      legal_person: current.contact || '',
      contact_phone: current.phone || '',
      contact_email: current.email || '',
      address: current.address || '',
      address_en: current.addressEn || current.address || '',
      notes: '',
      is_default: false,
    });
    setNotesInput('');
    setShowSaveDialog(true);
  };

  // 打开"编辑已有档案"弹窗
  const openEditDialog = (p: CompanyProfileRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditForm({ ...p });
    setNotesInput(p.notes || '');
    setShowSaveDialog(true);
  };

  // 保存（新增或更新）
  const handleSave = async () => {
    if (!editForm || !token) return;
    if (!editForm.company_name?.trim() && !editForm.company_name_en?.trim()) {
      toast.error('请至少填写公司名称');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_name: editForm.company_name,
        company_name_en: editForm.company_name_en,
        social_credit_code: editForm.social_credit_code,
        legal_person: editForm.legal_person,
        contact_phone: editForm.contact_phone,
        contact_email: editForm.contact_email,
        address: editForm.address,
        address_en: editForm.address_en,
        notes: notesInput,
      };
      if (editingId) {
        const res = await fetch(`/api/company-profiles/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || '更新失败');
        }
        toast.success('档案已更新');
      } else {
        const res = await fetch('/api/company-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || '保存失败');
        }
        toast.success('已保存为企业档案');
      }
      setShowSaveDialog(false);
      await fetchProfiles();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm('确定删除该企业档案？')) return;
    try {
      const res = await fetch(`/api/company-profiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('删除失败');
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const isXs = size === 'xs';
  const btnClass = isXs ? 'h-6 px-2 text-[10px]' : 'h-7 px-2.5 text-xs';

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={btnClass}
              disabled={authLoading}
            >
              <Building2 className="mr-1 h-3 w-3" />
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            {!user ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">登录后可使用已保存的企业档案</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    router.push('/login');
                  }}
                >
                  去登录
                </Button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">暂无已保存的企业档案</p>
                <p className="text-xs text-muted-foreground">填写当前信息后点击「保存为档案」即可</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto py-1">
                {profiles.map((p) => {
                  const title = p.company_name_en || p.company_name || '未命名企业';
                  const subtitle = p.contact_phone || p.contact_email || p.legal_person || '';
                  return (
                    <div
                      key={p.id}
                      className="group flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors cursor-pointer relative"
                      onClick={() => handlePick(p)}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{title}</p>
                          {p.is_default && (
                            <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">默认</span>
                          )}
                        </div>
                        {subtitle && (
                          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                        )}
                        {p.notes && (
                          <p className="mt-0.5 truncate text-[11px] text-amber-600 dark:text-amber-400">
                            备注: {p.notes}
                          </p>
                        )}
                        {(p.address_en || p.address) && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                            {p.address_en || p.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => openEditDialog(p, e)}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title="编辑"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {user && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs justify-start"
                  onClick={openSaveDialog}
                  disabled={saving || authLoading || isEmpty(current)}
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  将当前信息保存为档案
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btnClass}
          onClick={openSaveDialog}
          disabled={saving || authLoading || isEmpty(current)}
          title="将当前填写的信息保存为档案，可填写备注"
        >
          <Save className="mr-1 h-3 w-3" />
          保存
        </Button>
      </div>

      {/* 保存/编辑弹窗 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑企业档案' : '保存为企业档案'}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">公司名称（中文）</label>
                  <Input
                    value={editForm.company_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    placeholder="公司全称"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Company Name (English)</label>
                  <Input
                    value={editForm.company_name_en || ''}
                    onChange={(e) => setEditForm({ ...editForm, company_name_en: e.target.value })}
                    placeholder="English name"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">统一社会信用代码</label>
                  <Input
                    value={editForm.social_credit_code || ''}
                    onChange={(e) => setEditForm({ ...editForm, social_credit_code: e.target.value })}
                    placeholder="18位代码"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">联系人/法人</label>
                  <Input
                    value={editForm.legal_person || ''}
                    onChange={(e) => setEditForm({ ...editForm, legal_person: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">电话</label>
                  <Input
                    value={editForm.contact_phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">邮箱</label>
                  <Input
                    value={editForm.contact_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">地址（中文）</label>
                <Input
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Address (English)</label>
                <Input
                  value={editForm.address_en || ''}
                  onChange={(e) => setEditForm({ ...editForm, address_en: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">备注</label>
                <Textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="例如：总部公司、分公司、合作供应商等"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
              <X className="mr-1 h-3.5 w-3.5" />取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              {editingId ? '更新' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
