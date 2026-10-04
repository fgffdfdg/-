'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import type { VisualCalculator } from '@/lib/quote-calculator/types';
import {
  deleteCalculator as deleteLocalCalculator,
  loadTrashCalculators,
  mergeCalculators,
  restoreCalculator as restoreLocalCalculator,
} from '@/lib/quote-calculator/storage';
import {
  fetchTrashCalculators,
  permanentDeleteCloudCalculator,
  restoreCloudCalculator,
} from '@/lib/quote-calculator/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TrashDialogProps {
  open: boolean;
  onClose: () => void;
  token: string | null;
  /** 恢复成功后通知主页面刷新方案列表 */
  onRestored: () => void;
}

export function TrashDialog({ open, onClose, token, onRestored }: TrashDialogProps) {
  const [items, setItems] = useState<VisualCalculator[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VisualCalculator | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const local = loadTrashCalculators();
      let merged = local;
      if (token) {
        try {
          merged = mergeCalculators(local, await fetchTrashCalculators(token));
        } catch {
          merged = local;
        }
      }
      setItems(merged);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) void loadTrash();
  }, [open, loadTrash]);

  const handleRestore = async (item: VisualCalculator) => {
    setBusyId(item.id);
    try {
      restoreLocalCalculator(item.id);
      if (token && item.cloudId) {
        await restoreCloudCalculator(token, item.cloudId);
      }
      setItems((prev) => prev.filter((c) => c.id !== item.id));
      toast.success(`方案「${item.title || '未命名'}」已恢复`);
      onRestored();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (item: VisualCalculator) => {
    setBusyId(item.id);
    try {
      deleteLocalCalculator(item.id);
      if (token && item.cloudId) {
        await permanentDeleteCloudCalculator(token, item.cloudId);
      }
      setItems((prev) => prev.filter((c) => c.id !== item.id));
      toast.success(`方案「${item.title || '未命名'}」已彻底删除`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>回收站</DialogTitle>
            <DialogDescription>
              已删除的方案会保留在这里，可随时恢复；彻底删除后不可找回。
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">回收站是空的</div>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title || '未命名方案'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.cells.length} 个单元格
                      {item.deletedAt &&
                        ` · 删除于 ${new Date(item.deletedAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                      {!item.cloudId && ' · 仅本地'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void handleRestore(item)}
                      className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      恢复
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => setConfirmDelete(item)}
                      title="彻底删除"
                      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 彻底删除确认 */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>彻底删除方案「{confirmDelete?.title || '未命名'}」？</AlertDialogTitle>
            <AlertDialogDescription>
              该方案共 {confirmDelete?.cells.length ?? 0}{' '}
              个单元格，彻底删除后无法恢复。如果只是暂时不用，建议保留在回收站。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && void handlePermanentDelete(confirmDelete)}
            >
              彻底删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
