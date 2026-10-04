'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Link as LinkIcon,
  Star,
  Plus,
  ShieldAlert,
  Globe,
  Building2,
  Server,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listTaxBureaus,
  createTaxBureau,
  deleteTaxBureau,
} from '@/lib/invoice-tax/client';
import type { TaxBureauFavorite, TaxBureauSiteType } from '@/lib/invoice-tax/types';

const TYPE_LABEL: Record<TaxBureauSiteType, string> = {
  national: '国家级',
  provincial: '省市局',
  business_system: '业务系统',
};

const TYPE_STYLE: Record<TaxBureauSiteType, string> = {
  national: 'bg-primary/10 text-primary',
  provincial: 'bg-success/10 text-success',
  business_system: 'bg-warning/10 text-warning',
};

const TYPE_TABS: { key: TaxBureauSiteType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'national', label: '国家级' },
  { key: 'provincial', label: '省市电子税务局' },
  { key: 'business_system', label: '业务系统' },
];

const REGIONS = [
  '全国',
  '广东',
  '浙江',
  '江苏',
  '山东',
  '上海',
  '北京',
  '天津',
  '福建',
  '四川',
];

const BUSINESS_TAG_OPTIONS = [
  '纳税申报',
  '发票查验',
  '出口退税',
  '发票开具',
  '社保费',
  '政策查询',
];

const TYPE_ICON: Record<TaxBureauSiteType, React.ComponentType<{ className?: string }>> = {
  national: Building2,
  provincial: Globe,
  business_system: Server,
};

interface FormState {
  name: string;
  url: string;
  site_type: TaxBureauSiteType;
  region: string;
  description: string;
  business_tags: string[];
}

const EMPTY_FORM: FormState = {
  name: '',
  url: '',
  site_type: 'provincial',
  region: '全国',
  description: '',
  business_tags: [],
};

export default function TaxBureausPage() {
  const { token, loading: authLoading } = useAuth();
  const { organization } = useOrg();
  const [items, setItems] = useState<TaxBureauFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<TaxBureauSiteType | 'all'>('all');
  const [activeRegion, setActiveRegion] = useState<string>('全国');
  const [toast, setToast] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    if (authLoading || !token) return;
    setLoading(true);
    try {
      // token 来自 useAuth()
      const res = await listTaxBureaus(token, {
        organizationId: organization?.id ?? null,
        limit: 200,
      });
      setItems(res.data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token, organization?.id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeType !== 'all' && item.site_type !== activeType) return false;
      if (activeRegion !== '全国' && item.region !== activeRegion) return false;
      if (kw) {
        const haystack = `${item.name} ${item.url} ${item.description ?? ''}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [items, search, activeType, activeRegion]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: items.length, national: 0, provincial: 0, business_system: 0 };
    items.forEach((i) => {
      base[i.site_type] += 1;
    });
    return base;
  }, [items]);

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制');
    } catch {
      showToast('复制失败');
    }
  };

  const handleToggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      business_tags: prev.business_tags.includes(tag)
        ? prev.business_tags.filter((t) => t !== tag)
        : [...prev.business_tags, tag],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      showToast('请填写名称和网址');
      return;
    }
    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setSubmitting(true);
    try {
      // token 来自 useAuth()
      await createTaxBureau(token, {
        name: form.name.trim(),
        url,
        site_type: form.site_type,
        region: form.region,
        description: form.description.trim() || null,
        business_tags: form.business_tags,
        organization_id: organization?.id ?? null,
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      showToast('已添加收藏');
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此收藏吗？')) return;
    try {
      // token 来自 useAuth()
      await deleteTaxBureau(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('已删除收藏');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">税务局官网导航</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            收藏常用税务局与电子税务局入口，一键直达官方办事网站
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          添加收藏
        </Button>
      </div>

      {/* 安全提示 */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-foreground">
          请认准税务局官方域名
          <code className="mx-1 rounded bg-background px-1.5 py-0.5 font-mono text-xs text-primary">
            chinatax.gov.cn
          </code>
          ，谨防钓鱼网站。建议通过本页收藏入口访问，不要轻信搜索结果中的广告链接。
        </div>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索地区或网站名称，如：广东、电子税务局"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {TYPE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeType === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveType(tab.key)}
              className="h-8"
            >
              {tab.label}
              <span className="ml-1 text-xs opacity-70">{counts[tab.key] ?? 0}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 主体：左侧地区筛选 + 右侧卡片 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* 地区筛选 */}
        <aside className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">按地区筛选</p>
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRegion(r)}
                className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  activeRegion === r
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </aside>

        {/* 卡片网格 */}
        <div>
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card py-20 text-center">
              <Globe className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">未找到匹配的税务局入口</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                添加收藏
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => {
                const Icon = TYPE_ICON[item.site_type];
                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${TYPE_STYLE[item.site_type]}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {item.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className={TYPE_STYLE[item.site_type]}>
                            {TYPE_LABEL[item.site_type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.region}</span>
                        </div>
                      </div>
                      <Star className="h-4 w-4 fill-warning text-warning" />
                    </div>

                    {item.description && (
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1.5">
                      <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs text-foreground/80">
                        {item.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>

                    {item.business_tags && item.business_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.business_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        访问官网
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(item.url)}
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 添加收藏对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>添加税务局收藏</DialogTitle>
            <DialogDescription>
              录入常用的税务局或电子税务局入口，方便后续快速访问。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bureau-name">机构名称 *</Label>
              <Input
                id="bureau-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：广东省电子税务局"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bureau-url">官网网址 *</Label>
              <Input
                id="bureau-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://etax.guangdong.chinatax.gov.cn"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>机构类型</Label>
                <Select
                  value={form.site_type}
                  onValueChange={(v) => setForm({ ...form, site_type: v as TaxBureauSiteType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">国家级</SelectItem>
                    <SelectItem value="provincial">省市电子税务局</SelectItem>
                    <SelectItem value="business_system">业务系统</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>所属地区</Label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>常用业务标签</Label>
              <div className="flex flex-wrap gap-1.5">
                {BUSINESS_TAG_OPTIONS.map((tag) => {
                  const active = form.business_tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bureau-desc">备注说明</Label>
              <Input
                id="bureau-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="如：用于广东省内企业纳税申报"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存收藏'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
