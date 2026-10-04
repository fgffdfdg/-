'use client';

import { useMemo, useState } from 'react';
import { Check, Plus, Save, Search, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';
import type { LicenseSnippet } from '@/lib/export-license/storage';

export interface SnippetPickerProps<T extends Record<string, string>> {
  /** 档案类型，用于区分存储 */
  kind: 'goods' | 'owner';
  /** 标签文案 */
  label: string;
  /** 当前表单中的数据，保存档案时使用 */
  value: T;
  /** 判断当前数据是否为空（用于禁用保存） */
  isEmpty: (v: T) => boolean;
  /** 列表中每一项的副标题（从 data 中提取） */
  previewLines: (data: T) => string[];
  /** 加载档案 */
  listProfiles: () => LicenseSnippet[];
  saveProfile: (input: { id?: string; name: string; note?: string; data: T }) => LicenseSnippet;
  touchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  /** 选中档案后回调，父组件 setMain/setAnnex */
  onPick: (data: T) => void;
}

export default function LicenseSnippetPicker<T extends Record<string, string>>({
  label,
  value,
  isEmpty,
  previewLines,
  listProfiles,
  saveProfile,
  touchProfile,
  deleteProfile,
  onPick,
}: SnippetPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<LicenseSnippet[]>(() => listProfiles());
  const [keyword, setKeyword] = useState('');

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNote, setSaveNote] = useState('');

  const refresh = () => setProfiles(listProfiles());

  const filtered = useMemo(() => {
    const q = keyword.trim().toUpperCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const hay = [
        p.name,
        p.note ?? '',
        ...Object.values(p.data),
      ]
        .join(' ')
        .toUpperCase();
      return hay.includes(q);
    });
  }, [profiles, keyword]);

  const handlePick = (p: LicenseSnippet) => {
    onPick(p.data as T);
    touchProfile(p.id);
    setOpen(false);
    setKeyword('');
    toast.success(`已带入：${p.name}`);
  };

  const openSaveDialog = () => {
    if (isEmpty(value)) {
      toast.error(`请先填写${label}，再保存档案`);
      return;
    }
    setSaveName('');
    setSaveNote('');
    setSaveOpen(true);
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error('请填写档案名称');
      return;
    }
    saveProfile({
      name: saveName.trim(),
      note: saveNote.trim() || undefined,
      data: value,
    });
    setSaveOpen(false);
    refresh();
    toast.success('档案已保存');
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    refresh();
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) refresh();
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
            <Check className="mr-1 h-3 w-3" />
            一键复用
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="end">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={`搜索${label}档案`}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8 px-4">
                {profiles.length === 0
                  ? `还没有保存过${label}档案，填写后点击"保存档案"即可。`
                  : '没有匹配的档案'}
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {p.name}
                      </span>
                      {p.note ? (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {p.note}
                        </span>
                      ) : null}
                    </div>
                    {previewLines(p.data as T).map((line, i) => (
                      <div
                        key={i}
                        className="text-[11px] text-muted-foreground/90 truncate"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                openSaveDialog();
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              保存当前内容为新档案
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={openSaveDialog}
      >
        <Save className="mr-1 h-3 w-3" />
        保存档案
      </Button>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存{label}档案</DialogTitle>
            <DialogDescription>
              给这份{label}起个名字，方便下次一键带入。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">档案名称</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`如：主力${label}`}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">备注（可选，便于在列表中识别）</Label>
              <Textarea
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="例如：含 HS 编码、新能源车型专用"
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
