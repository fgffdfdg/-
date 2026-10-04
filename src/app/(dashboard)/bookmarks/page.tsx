'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Search,
  Globe,
  Check,
  Link2,
  FileText,
  BookOpen,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Scale,
  FileBadge,
  FileSpreadsheet,
  Download,
  ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  username: string;
  password: string;
  favicon_url: string;
  created_at: string;
  updated_at: string | null;
}

interface BookmarkForm {
  title: string;
  url: string;
  description: string;
  category: string;
  username: string;
  password: string;
}

type TabKey = 'license' | 'tutorial' | 'bookmarks';

const emptyForm: BookmarkForm = {
  title: '',
  url: '',
  description: '',
  category: '',
  username: '',
  password: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getAuthHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

// ─── Export License Materials ────────────────────────────────────────

interface MaterialItem {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  internalLink?: string;
  internalLinkLabel?: string;
  note?: string;
}

const materials: MaterialItem[] = [
  {
    name: '机动车行驶证',
    description: '车辆行驶证复印件，需加盖公章',
    icon: FileBadge,
    note: '需自行准备',
  },
  {
    name: '二手车质量检测报告',
    description: '由具备资质的第三方检测机构出具',
    icon: FileCheck,
    note: '需自行准备',
  },
  {
    name: '检测机构声明',
    description: '检测机构出具的符合性声明文件',
    icon: Scale,
    note: '需自行准备',
  },
  {
    name: '二手乘用车出口质量报告',
    description: '针对二手乘用车的专项出口质量报告',
    icon: ClipboardList,
    note: '需自行准备',
  },
  {
    name: '外销合同',
    description: '与海外买方签订的车辆销售合同',
    icon: FileSpreadsheet,
    internalLink: '/documents-generator',
    internalLinkLabel: '前往制作合同',
  },
  {
    name: '准入声明',
    description: '符合目标市场准入标准的声明文件',
    icon: ShieldCheck,
    internalLink: '/export-declaration',
    internalLinkLabel: '前往生成准入声明',
  },
];

// ─── Main Page ───────────────────────────────────────────────────────

export default function BookmarksPage() {
  const { user, token, loading } = useAuth();
  const { currentOrgId } = useOrg();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('license');

  // No auth redirect - allow usage without login, just disable save

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'license', label: '出口许可证', icon: FileText },
    { key: 'tutorial', label: '教程', icon: BookOpen },
    { key: 'bookmarks', label: '我的收藏', icon: Link2 },
  ];

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
      <div>
        <h1 className="text-2xl font-bold">常用网址</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          出口许可证申请指引、业务教程、常用网站收藏
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'license' && <LicenseGuideTab />}
      {activeTab === 'tutorial' && <TutorialTab />}
      {activeTab === 'bookmarks' && (
        <BookmarksTab user={user} token={token} />
      )}
    </div>
  );
}

// ─── Tab 1: Export License Guide ─────────────────────────────────────

function LicenseGuideTab() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">许可证与收藏</h1>
        <p className="text-sm text-muted-foreground mt-1">出口许可证申请入口、准入声明、行业教程与资源收藏</p>
      </div>

      {/* Application Entry */}
      <div className="rounded-xl border border-navy/15 bg-navy/[0.03] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/[0.08]">
              <FileText className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">商务部出口许可证申请</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                商务部业务系统统一平台 — 二手车出口许可证在线申请入口
              </p>
            </div>
          </div>
          <a
            href="https://ecomp.mofcom.gov.cn/loginCorp.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm">
              前往申请
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Compliance Declaration Entry */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">准入声明生成</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  选择目标市场、添加车辆，一键生成符合准入标准的声明文件，支持 A4 预览与 PDF 导出
                </p>
              </div>
            </div>
            <Link href="/export-declaration" target="_blank">
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                前往生成
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Materials Checklist */}
      <div>
        <h3 className="text-base font-semibold mb-3">申请材料清单</h3>
        <p className="text-sm text-muted-foreground mb-4">
          申请二手车出口许可证需准备以下材料，带工具图标的材料可在平台内直接生成
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {materials.map((item) => {
            const Icon = item.icon;
            const hasLink = !!item.internalLink;
            return (
              <div
                key={item.name}
                className={`flex items-start gap-3 rounded-lg border p-4 ${
                  hasLink ? 'border-primary/20 bg-primary/5' : 'border-border'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  hasLink ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-5 w-5 ${hasLink ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{item.name}</h4>
                    {hasLink && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        可生成
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.internalLink && (
                    <a
                      href={item.internalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                    >
                      {item.internalLinkLabel}
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                  {item.note && !hasLink && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic">{item.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">提示：</span>
          完成以上材料准备后，通过上方「前往申请」按钮进入商务部平台提交申请。
          如有疑问，请查阅「教程」标签中的操作手册。
        </p>
      </div>
    </div>
  );
}

// ─── Tab 2: Tutorial ─────────────────────────────────────────────────

function TutorialTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">汽车出口一本通</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  二手车出口业务全流程操作手册
                </p>
              </div>
            </div>
            <a href="/汽车出口一本通.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                下载 PDF
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: '70vh' }}>
            <iframe
              src="/汽车出口一本通.pdf"
              className="w-full h-full border-0"
              title="汽车出口一本通"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 3: Custom Bookmarks ─────────────────────────────────────────

interface BookmarksTabProps {
  user: import('@supabase/supabase-js').User | null;
  token: string;
}

function BookmarksTab({ user, token }: BookmarksTabProps) {
  const { currentOrgId } = useOrg();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookmarkForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/bookmarks${currentOrgId ? `?organization_id=${currentOrgId}` : ''}`, {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      const items = (json.data ?? []) as Bookmark[];
      setBookmarks(items);

      const cats = new Set<string>();
      items.forEach((item) => {
        if (item.category) cats.add(item.category);
      });
      setCategories(Array.from(cats).sort());
    } catch {
      // silently fail
    } finally {
      setLoadingData(false);
    }
  }, [user, token, currentOrgId]);

  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user, loadBookmarks]);

  const filteredBookmarks = bookmarks.filter((item) => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setFormDialogOpen(true);
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setForm({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      category: bookmark.category,
      username: bookmark.username,
      password: bookmark.password,
    });
    setFormError('');
    setFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) {
      setFormError('请先登录后再保存');
      return;
    }
    if (!form.title.trim() || !form.url.trim()) {
      setFormError('标题和网址为必填项');
      return;
    }

    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      title: form.title.trim(),
      url,
      description: form.description.trim(),
      category: form.category.trim(),
      username: form.username.trim(),
      password: form.password,
      favicon_url: getFaviconUrl(url),
    };

    try {
      const apiUrl = editingId ? `/api/bookmarks/${editingId}` : '/api/bookmarks';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(apiUrl, {
        method,
        headers: getAuthHeaders(token),
        body: JSON.stringify({ ...payload, organization_id: currentOrgId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? '保存失败');
      }

      setFormDialogOpen(false);
      loadBookmarks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookmarks/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error('删除失败');
      setDeleteTarget(null);
      loadBookmarks();
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索标题、网址、备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          添加网址
        </Button>
      </div>

      {/* Bookmarks Grid */}
      {loadingData ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Link2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">暂无网址</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || activeCategory !== 'all'
              ? '没有匹配的结果，试试其他关键词'
              : '点击「添加网址」开始收藏常用网站'}
          </p>
          {!searchQuery && activeCategory === 'all' && (
            <Button onClick={handleAdd} className="mt-4" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              添加第一个网址
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBookmarks.map((item) => (
            <BookmarkCard
              key={item.id}
              bookmark={item}
              passwordVisible={visiblePasswords.has(item.id)}
              copiedField={copiedField}
              onTogglePassword={() => togglePasswordVisibility(item.id)}
              onCopy={handleCopy}
              onEdit={() => handleEdit(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑网址' : '添加网址'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改网址信息和账号密码' : '添加一个新的常用网址到收藏列表'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>标题 *</Label>
                <Input
                  placeholder="例如：商务部统一入口"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  placeholder="例如：政务平台"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>网址 *</Label>
              <Input
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="备注说明..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>账号</Label>
                <Input
                  placeholder="用户名 / 邮箱"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  placeholder="密码"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Bookmark Card Component ─────────────────────────────────────────

interface BookmarkCardProps {
  bookmark: Bookmark;
  passwordVisible: boolean;
  copiedField: string | null;
  onTogglePassword: () => void;
  onCopy: (text: string, fieldKey: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BookmarkCard({
  bookmark,
  passwordVisible,
  copiedField,
  onTogglePassword,
  onCopy,
  onEdit,
  onDelete,
}: BookmarkCardProps) {
  const hasCredentials = bookmark.username || bookmark.password;
  const faviconUrl = bookmark.favicon_url || getFaviconUrl(bookmark.url);

  return (
    <Card className="group hover:shadow-md transition-all hover:-translate-y-0.5">
      <CardContent className="p-5">
        {/* Title + Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className="h-5 w-5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                  }}
                />
              ) : (
                <Globe className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{bookmark.title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {extractDomain(bookmark.url)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {bookmark.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {bookmark.description}
          </p>
        )}

        {/* Category */}
        {bookmark.category && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-xs">
              {bookmark.category}
            </Badge>
          </div>
        )}

        {/* Credentials */}
        {hasCredentials && (
          <div className="space-y-2 mb-3 p-3 rounded-lg bg-muted/50 border">
            {bookmark.username && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">账号:</span>
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-sm truncate font-mono">{bookmark.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => onCopy(bookmark.username, `user-${bookmark.id}`)}
                  >
                    {copiedField === `user-${bookmark.id}` ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            {bookmark.password && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">密码:</span>
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-sm truncate font-mono">
                    {passwordVisible ? bookmark.password : '••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={onTogglePassword}
                  >
                    {passwordVisible ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => onCopy(bookmark.password, `pass-${bookmark.id}`)}
                  >
                    {copiedField === `pass-${bookmark.id}` ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Open Link */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          打开网站
        </a>
      </CardContent>
    </Card>
  );
}
