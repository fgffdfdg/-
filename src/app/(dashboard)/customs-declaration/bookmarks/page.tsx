'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Plus, Trash2, Globe, AlertCircle, LogIn } from 'lucide-react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

interface SavedUrl {
  id: string;
  title: string;
  url: string;
  notes?: string;
  created_at: string;
}

const DEFAULT_URLS: SavedUrl[] = [
  {
    id: 'default-1',
    title: '国际贸易单一窗口',
    url: 'https://app.singlewindow.cn/cas/login?service=https%3A%2F%2Fwww.singlewindow.cn%2Fsw%2Flogin.swdo',
    notes: '报关、报检、原产地证等国际贸易业务',
    created_at: new Date().toISOString(),
  },
];

export default function CustomsDeclarationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>(DEFAULT_URLS);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadSavedUrls();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('检查用户状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedUrls = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data, error } = await supabase
        .from('user_saved_urls')
        .select('*')
        .eq('category', 'customs_declaration')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载数据失败:', error);
        return;
      }

      if (data && data.length > 0) {
        setSavedUrls(data.map((item: any) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          notes: item.notes,
          created_at: item.created_at,
        })));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const handleAddUrl = async () => {
    if (!user) {
      alert('请先登录后再保存');
      return;
    }

    if (!newTitle.trim() || !newUrl.trim()) {
      alert('请填写标题和网址');
      return;
    }

    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase
        .from('user_saved_urls')
        .insert({
          user_id: user.id,
          category: 'customs_declaration',
          title: newTitle.trim(),
          url: newUrl.trim(),
          notes: newNotes.trim() || null,
        });

      if (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试');
        return;
      }

      setSavedUrls(prev => [{
        id: Date.now().toString(),
        title: newTitle.trim(),
        url: newUrl.trim(),
        notes: newNotes.trim(),
        created_at: new Date().toISOString(),
      }, ...prev]);

      setNewTitle('');
      setNewUrl('');
      setNewNotes('');
      setAddDialogOpen(false);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!user) return;

    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error } = await supabase
        .from('user_saved_urls')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
        return;
      }

      setSavedUrls(prev => prev.filter(item => item.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const isDefaultUrl = (id: string) => id.startsWith('default-');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">报关系统</h1>
        <p className="text-muted-foreground">保存常用的报关网站，快速访问国际贸易单一窗口</p>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                国际贸易单一窗口是报关、报检、原产地证等业务的核心平台。
              </p>
              <p className="text-sm text-muted-foreground">
                登录后可保存更多常用报关网站，方便快速访问。未登录状态下数据仅保存在当前浏览器。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            共 {savedUrls.length} 个网站
          </Badge>
          {user && (
            <Badge variant="outline" className="text-muted-foreground">
              已登录
            </Badge>
          )}
        </div>
        <Button
          onClick={() => {
            if (!user) {
              alert('请先登录后再添加');
              return;
            }
            setAddDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          添加网站
        </Button>
      </div>

      {/* URL List */}
      <div className="grid gap-4 md:grid-cols-2">
        {savedUrls.map((item) => (
          <Card key={item.id} className="group relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                {!isDefaultUrl(item.id) && user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.notes && (
                <p className="text-sm text-muted-foreground line-clamp-2">{item.notes}</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={item.url}
                  readOnly
                  className="text-xs bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => window.open(item.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加报关网站</DialogTitle>
            <DialogDescription>
              保存常用的报关相关网站，方便快速访问
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">网站名称</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：XX海关报关系统"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">网址</Label>
              <Input
                id="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注（可选）</Label>
              <Input
                id="notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="网站用途说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddUrl} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个网站吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteUrl(deleteConfirmId)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Prompt for non-logged users */}
      {!user && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogIn className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">登录以保存更多网站</p>
                  <p className="text-xs text-muted-foreground">登录后数据将同步到您的账户</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/login'}>
                去登录
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
