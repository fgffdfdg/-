'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ship, Check, Trash2, Pencil, X, Save } from 'lucide-react';
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

/**
 * 装箱单运输信息模板（本地存储）
 * 字段与 PackingListData 中的运输字段一一对应：
 * vessels/voyage/blNo/containerNo/sealNo/containerType
 */
export interface ShippingProfile {
  id: string;
  name: string;
  vessels: string;
  voyage: string;
  blNo: string;
  containerNo: string;
  sealNo: string;
  containerType: string;
  notes: string;
  createdAt: number;
}

export interface ShippingInfo {
  vessels: string;
  voyage: string;
  blNo: string;
  containerNo: string;
  sealNo: string;
  containerType: string;
}

interface Props {
  current: ShippingInfo;
  onPick: (info: ShippingInfo) => void;
  size?: 'sm' | 'xs';
}

const STORAGE_KEY = 'exportdrive:shipping-profiles:v1';

function loadProfiles(): ShippingProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ShippingProfile[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveProfiles(list: ShippingProfile[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function isEmpty(info: ShippingInfo): boolean {
  return !info.vessels && !info.voyage && !info.blNo &&
    !info.containerNo && !info.sealNo && !info.containerType;
}

function genName(info: ShippingInfo): string {
  if (info.vessels) {
    return `${info.vessels}${info.voyage ? ' / ' + info.voyage : ''}`;
  }
  if (info.blNo) return `B/L: ${info.blNo}`;
  if (info.containerNo) return `CNTR: ${info.containerNo}`;
  return `运输模板 ${new Date().toLocaleDateString()}`;
}

const emptyEditForm = (): ShippingProfile => ({
  id: '',
  name: '',
  vessels: '',
  voyage: '',
  blNo: '',
  containerNo: '',
  sealNo: '',
  containerType: '',
  notes: '',
  createdAt: 0,
});

export default function ShippingProfilePicker({ current, onPick, size = 'xs' }: Props) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingProfile>(emptyEditForm());

  const refresh = useCallback(() => {
    setProfiles(loadProfiles());
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handlePick = (p: ShippingProfile) => {
    onPick({
      vessels: p.vessels,
      voyage: p.voyage,
      blNo: p.blNo,
      containerNo: p.containerNo,
      sealNo: p.sealNo,
      containerType: p.containerType,
    });
    setOpen(false);
    toast.success(`已填入运输模板「${p.name}」`);
  };

  const openSaveDialog = () => {
    if (isEmpty(current)) {
      toast.error('当前运输信息为空，请先填写船名/航次或提单号');
      return;
    }
    setEditingId(null);
    setForm({
      ...emptyEditForm(),
      name: genName(current),
      vessels: current.vessels,
      voyage: current.voyage,
      blNo: current.blNo,
      containerNo: current.containerNo,
      sealNo: current.sealNo,
      containerType: current.containerType,
    });
    setShowDialog(true);
  };

  const openEditDialog = (p: ShippingProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setForm({ ...p });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.vessels && !form.voyage && !form.blNo && !form.containerNo) {
      toast.error('请至少填写船名/航次或提单号');
      return;
    }
    const name = form.name.trim() || genName(form);
    const list = loadProfiles();
    if (editingId) {
      const next = list.map((p) =>
        p.id === editingId ? { ...form, name, id: editingId } : p
      );
      saveProfiles(next);
      setProfiles(next);
      toast.success('运输模板已更新');
    } else {
      const newItem: ShippingProfile = {
        ...form,
        name,
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      const next = [newItem, ...list].slice(0, 30);
      saveProfiles(next);
      setProfiles(next);
      toast.success('运输信息已保存为模板');
    }
    setShowDialog(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除该运输模板？')) return;
    const next = loadProfiles().filter((p) => p.id !== id);
    saveProfiles(next);
    setProfiles(next);
  };

  const isXs = size === 'xs';
  const btnClass = isXs ? 'h-6 px-2 text-[10px]' : 'h-7 px-2.5 text-xs';

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={btnClass}>
              <Ship className="mr-1 h-3 w-3" />
              一键选择
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            {profiles.length === 0 ? (
              <div className="p-4 text-center space-y-1">
                <p className="text-sm text-muted-foreground">暂无保存的运输模板</p>
                <p className="text-xs text-muted-foreground">填写船名/航次/提单/箱号后点击「保存」即可</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto py-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="group flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors cursor-pointer relative"
                    onClick={() => handlePick(p)}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy">
                      <Ship className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.blNo, p.containerNo, p.sealNo].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {p.notes && (
                        <p className="mt-0.5 truncate text-[11px] text-amber-600 dark:text-amber-400">
                          备注: {p.notes}
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
                ))}
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
          disabled={isEmpty(current)}
          title="将当前运输信息保存为模板，可填写备注"
        >
          <Save className="mr-1 h-3 w-3" />
          保存
        </Button>
      </div>

      {/* 保存/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑运输模板' : '保存为运输模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">模板名称</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="留空将自动生成"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">船名 / Vessel</label>
                <Input
                  value={form.vessels}
                  onChange={(e) => setForm({ ...form, vessels: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">航次 / Voyage</label>
                <Input
                  value={form.voyage}
                  onChange={(e) => setForm({ ...form, voyage: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">提单号 / B/L No.</label>
                <Input
                  value={form.blNo}
                  onChange={(e) => setForm({ ...form, blNo: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">集装箱型</label>
                <Input
                  value={form.containerType}
                  onChange={(e) => setForm({ ...form, containerType: e.target.value })}
                  placeholder="如 40HQ"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">箱号 / Container No.</label>
                <Input
                  value={form.containerNo}
                  onChange={(e) => setForm({ ...form, containerNo: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">封条号 / Seal No.</label>
                <Input
                  value={form.sealNo}
                  onChange={(e) => setForm({ ...form, sealNo: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">备注</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="例如：指定货代、特殊操作要求等"
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDialog(false)}>
              <X className="mr-1 h-3.5 w-3.5" />取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {editingId ? '更新' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
