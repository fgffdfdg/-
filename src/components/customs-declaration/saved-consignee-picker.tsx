'use client';

import * as React from 'react';
import { Bookmark, Trash2, Save, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import type { DeclarationParty } from '@/lib/customs-declaration/types';
import {
  listSavedConsignees,
  saveConsignee,
  deleteSavedConsignee,
  toDeclarationParty,
  type SavedConsignee,
} from '@/lib/customs-declaration/consignee-storage';

interface Props {
  /** 当前编辑器中的收货人信息 */
  currentConsignee: DeclarationParty;
  onPick: (party: DeclarationParty) => void;
}

export function SavedConsigneePicker({ currentConsignee, onPick }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState<SavedConsignee[]>([]);

  const refresh = React.useCallback(() => {
    setSaved(listSavedConsignees());
  }, []);

  React.useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const hasCurrent = currentConsignee.name.trim().length > 0;

  const handleSave = () => {
    if (!hasCurrent) {
      toast.error('请先填写境外收货人名称');
      return;
    }
    saveConsignee(currentConsignee);
    toast.success('已保存收货人信息');
    refresh();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSavedConsignee(id);
    refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* 保存按钮 */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasCurrent}
        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="保存当前收货人信息以便复用"
      >
        <Save className="w-3 h-3" />
        保存
      </button>

      {/* 复用下拉 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium whitespace-nowrap transition-colors"
            title="从已保存的收货人中复用"
          >
            <Bookmark className="w-3 h-3" />
            复用
            <ChevronDown className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="px-3 py-2 border-b border-outline-variant/30">
            <span className="text-xs font-medium text-on-surface">已保存的收货人</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {saved.length === 0 ? (
              <div className="text-center text-xs text-on-surface-variant py-6">
                暂无已保存的收货人
              </div>
            ) : (
              saved.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-surface-container/70 flex items-start gap-2 group"
                  onClick={() => {
                    onPick(toDeclarationParty(item));
                    setOpen(false);
                    toast.success('已回填收货人信息');
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-on-surface truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-on-surface-variant truncate mt-0.5">
                      {[item.code, item.address, item.phone]
                        .filter(Boolean)
                        .join(' · ') || '无详细信息'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-error/60 hover:text-error hover:bg-error/10 flex-shrink-0 mt-0.5 transition-opacity"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}