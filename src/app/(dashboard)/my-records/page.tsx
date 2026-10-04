'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Search, Trash2, Eye, Loader2, Plus, User, KeyRound, Phone, Pencil, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';
import { useOrg } from '@/lib/org';

interface DeclarationRecord {
  id: string;
  title: string;
  company_info: { companyName: string; creditCode: string; recipient: string; date: string };
  vehicles: Array<{ brand: string; model: string; vin: string; destination: string }>;
  created_at: string;
  updated_at: string;
}

export default function MyRecordsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { currentOrgId } = useOrg();
  const [records, setRecords] = useState<DeclarationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRecord, setPreviewRecord] = useState<DeclarationRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Account section state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
    }
  }, [user]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance-declarations${currentOrgId ? `?organization_id=${currentOrgId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : (data?.data ?? []));
    } catch { toast.error('加载失败'); setRecords([]); }
    finally { setLoading(false); }
  }, [currentOrgId, token]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/compliance-declarations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success('已删除');
    } catch { toast.error('删除失败'); }
    finally { setDeletingId(null); }
  };

  const filtered = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.company_info?.companyName?.toLowerCase().includes(q) ||
      r.vehicles?.some((v) => v.brand?.toLowerCase().includes(q) || v.vin?.toLowerCase().includes(q) || v.destination?.toLowerCase().includes(q));
  });

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('密码至少 6 位'); return; }
    if (newPassword !== confirmPassword) { toast.error('两次密码不一致'); return; }
    setChangingPassword(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('密码修改成功');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone || '-';
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) { toast.error('用户名不能为空'); return; }
    setSavingName(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      if (error) throw error;
      toast.success('用户名已更新');
      setEditingName(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSavingName(false);
    }
  };

  const startEditName = () => {
    setDisplayName(user?.user_metadata?.display_name || '');
    setEditingName(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">我的记录</h1>
          <p className="text-sm text-muted-foreground mt-1">管理账户信息与业务记录</p>
        </div>
        <Button size="sm" asChild><Link href="/compliance-declaration"><Plus className="mr-2 h-3.5 w-3.5" />新建声明</Link></Button>
      </div>

      {!authLoading && !user && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <LogIn className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">登录后即可管理账户信息、保存业务记录</p>
            <Button size="sm" asChild className="ml-auto"><Link href="/login">去登录</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* 账户信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />账户信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 用户名 */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">用户名</div>
                {editingName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="请输入用户名"
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveName} disabled={savingName}>
                      {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-xs">✓</span>}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingName(false)}>
                      <span className="text-xs">✕</span>
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm font-medium truncate">{authLoading ? '...' : (user?.user_metadata?.display_name || '未设置')}</div>
                )}
              </div>
              {!editingName && (
                <Button variant="ghost" size="sm" onClick={startEditName}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />修改
                </Button>
              )}
            </div>
            {/* 登录手机号 */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">登录手机号</div>
                <div className="text-sm font-medium">{authLoading ? '...' : maskPhone(user?.phone || '')}</div>
              </div>
            </div>
            {/* 登录密码 */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">登录密码</div>
                <div className="text-sm font-medium">••••••••</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />修改
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 企业信息已迁移至各业务页面直接保存（如形式发票、出口声明等） */}

      <Card><CardContent className="pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索标题、公司、品牌、VIN码..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </CardContent></Card>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{searchQuery ? '没有找到匹配的记录' : '暂无保存的声明记录'}</p>
          {!searchQuery && <Button variant="outline" className="mt-4" asChild><Link href="/compliance-declaration">创建第一份声明</Link></Button>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">{record.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 ml-2">{record.vehicles?.length || 0} 辆</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="line-clamp-1">{record.company_info?.companyName || '未命名公司'}</div>
                  <div className="line-clamp-1">目的国：{record.vehicles?.map((v) => v.destination).filter(Boolean).join('、') || '-'}</div>
                  <div className="text-xs">{record.updated_at ? `更新于 ${new Date(record.updated_at).toLocaleString('zh-CN')}` : `创建于 ${new Date(record.created_at).toLocaleString('zh-CN')}`}</div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewRecord(record)}><Eye className="mr-1.5 h-3.5 w-3.5" />查看</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/compliance-declaration?id=${record.id}`)}>编辑</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(record.id)} disabled={deletingId === record.id}>
                    {deletingId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!previewRecord} onOpenChange={(open) => !open && setPreviewRecord(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewRecord?.title}</DialogTitle></DialogHeader>
          {previewRecord && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm">企业信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">公司名称：</span>{previewRecord.company_info?.companyName || '-'}</div>
                  <div><span className="text-muted-foreground">信用代码：</span>{previewRecord.company_info?.creditCode || '-'}</div>
                  <div><span className="text-muted-foreground">接收单位：</span>{previewRecord.company_info?.recipient || '-'}</div>
                  <div><span className="text-muted-foreground">声明日期：</span>{previewRecord.company_info?.date || '-'}</div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm">车辆列表</h4>
                <div className="space-y-2">
                  {previewRecord.vehicles?.map((v, i) => (
                    <div key={i} className="flex items-center gap-4 text-sm border-b pb-2 last:border-0">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <span className="flex-1">{v.brand} {v.model}</span>
                      <span className="font-mono text-xs">{v.vin}</span>
                      <Badge variant="outline">{v.destination}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 修改密码弹窗 */}
      <Dialog open={showChangePassword} onOpenChange={(open) => { setShowChangePassword(open); if (!open) { setNewPassword(''); setConfirmPassword(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />修改登录密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="请输入新密码（至少 6 位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">两次密码不一致</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowChangePassword(false); setNewPassword(''); setConfirmPassword(''); }}>取消</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
