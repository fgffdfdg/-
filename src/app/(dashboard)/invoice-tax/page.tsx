'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Landmark,
  Plus,
  ExternalLink,
  IdCard,
  ClipboardCopy,
  Bell,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  listInvoiceTitles,
  listTaxBureaus,
  maskBankAccount,
  formatDateTime,
} from '@/lib/invoice-tax/client';
import type { InvoiceTitle, TaxBureauFavorite } from '@/lib/invoice-tax/types';

interface SummaryCard {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'primary' | 'success' | 'warning' | 'muted';
}

interface QuickAction {
  label: string;
  href: string;
  desc: string;
}

interface TaxReminder {
  title: string;
  desc: string;
  status: 'urgent' | 'normal' | 'done';
}

const TONE_STYLES: Record<SummaryCard['tone'], string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-muted text-muted-foreground',
};

const TITLE_TYPE_LABEL: Record<InvoiceTitle['title_type'], string> = {
  own_company: '本公司',
  partner: '合作方',
};

export default function InvoiceTaxHomePage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const { organization } = useOrg();
  const [titles, setTitles] = useState<InvoiceTitle[]>([]);
  const [bureaus, setBureaus] = useState<TaxBureauFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (authLoading || !token) return;
      setLoading(true);
      try {
        // token 来自 useAuth()
        const [titlesRes, bureausRes] = await Promise.all([
          listInvoiceTitles(token, {
            organizationId: organization?.id ?? null,
            limit: 4,
          }),
          listTaxBureaus(token, {
            organizationId: organization?.id ?? null,
            limit: 100,
          }),
        ]);
        if (cancelled) return;
        setTitles(titlesRes.data);
        setBureaus(bureausRes.data);
      } catch {
        if (!cancelled) {
          setTitles([]);
          setBureaus([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token, organization?.id]);

  const ownCount = titles.filter((t) => t.title_type === 'own_company').length;
  const partnerCount = titles.filter((t) => t.title_type === 'partner').length;
  const lastUpdated =
    titles.reduce<string | null>((latest, t) => {
      if (!latest) return t.updated_at;
      return t.updated_at > latest ? t.updated_at : latest;
    }, null) ?? null;

  const summaryCards: SummaryCard[] = [
    {
      label: '收藏的税务局',
      value: bureaus.length,
      hint: '覆盖常用电子税务局与业务系统',
      icon: Landmark,
      tone: 'primary',
    },
    {
      label: '本公司抬头',
      value: ownCount,
      hint: '销售方/开票方信息快速填充',
      icon: IdCard,
      tone: 'success',
    },
    {
      label: '合作方抬头',
      value: partnerCount,
      hint: '海外买家与国内供应商信息',
      icon: FileText,
      tone: 'warning',
    },
    {
      label: '最近更新',
      value: loading ? '—' : formatDateTime(lastUpdated),
      hint: '抬头或税局入口最近维护时间',
      icon: Clock,
      tone: 'muted',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: '新增本公司抬头',
      href: '/invoice-titles/new?type=own_company',
      desc: '维护销售方开票信息',
    },
    {
      label: '新增合作方抬头',
      href: '/invoice-titles/new?type=partner',
      desc: '录入海外买家或供应商',
    },
    { label: '发票查验入口', href: '/tax-bureaus', desc: '增值税发票查验平台' },
    { label: '出口退税申报', href: '/tax-bureaus', desc: '出口退（免）税申报系统' },
    {
      label: '增值税发票综合服务平台',
      href: '/tax-bureaus',
      desc: '进项发票勾选确认',
    },
    { label: '电子税务局登录', href: '/tax-bureaus', desc: '各省电子税务局直达' },
  ];

  const reminders: TaxReminder[] = [
    {
      title: '增值税及附加税申报截止',
      desc: '每月 15 日前完成申报，遇节假日顺延。建议提前 3 个工作日核对数据。',
      status: 'urgent',
    },
    {
      title: '出口退税单证备案',
      desc: '收汇后次月申报期内完成单证备案，确保报关单、收汇凭证、发票齐全。',
      status: 'normal',
    },
    {
      title: '企业所得税季度预缴',
      desc: '1 月、4 月、7 月、10 月 15 日前完成上一季度预缴申报。',
      status: 'done',
    },
  ];

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动选择');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">发票 / 报税</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理税务局官网入口、常用发票抬头，快速处理出口业务开票与报税资料
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/tax-bureaus">
              <Landmark className="mr-1.5 h-4 w-4" />
              访问税务局导航
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/invoice-titles/new">
              <Plus className="mr-1.5 h-4 w-4" />
              新增发票抬头
            </Link>
          </Button>
        </div>
      </div>

      {/* 摘要卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${TONE_STYLES[card.tone]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="truncate text-xl font-semibold text-foreground">{card.value}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{card.hint}</p>
            </div>
          );
        })}
      </div>

      {/* 核心功能入口 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link
          href="/tax-bureaus"
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">税务局官网导航</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                收藏并快速跳转国家税务总局及各省市电子税务局，处理发票查验、纳税申报、出口退税等业务。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                进入导航
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          href="/invoice-titles"
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <IdCard className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">常用发票抬头</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                维护本公司及合作方的发票抬头信息，包括名称、税号、地址电话、开户行账号，开票时一键调用。
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                管理抬头
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 下方内容：最近抬头 + 报税提醒 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 最近使用抬头 */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">最近使用抬头</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoice-titles" className="text-primary">
                查看全部
              </Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">名称</th>
                    <th className="px-4 py-3 font-medium">税号</th>
                    <th className="px-4 py-3 font-medium">更新时间</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        加载中...
                      </td>
                    </tr>
                  ) : titles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        暂无发票抬头，
                        <Link href="/invoice-titles/new" className="text-primary hover:underline">
                          立即添加
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    titles.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Badge
                            variant={t.title_type === 'own_company' ? 'default' : 'secondary'}
                            className={
                              t.title_type === 'own_company'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-warning/15 text-warning'
                            }
                          >
                            {TITLE_TYPE_LABEL[t.title_type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{t.company_name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {t.bank_name ? `${t.bank_name} · ${maskBankAccount(t.bank_account)}` : '未填写银行信息'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => copyText(t.tax_id || t.overseas_tax_id || '—')}
                            className="group inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary"
                            title="点击复制"
                          >
                            <span>{t.tax_id || t.overseas_tax_id || '—'}</span>
                            <ClipboardCopy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(t.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/invoice-titles/${t.id}/edit`)}
                          >
                            编辑
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 报税提醒 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">报税提醒</h2>
            <Badge variant="outline" className="gap-1 text-xs">
              <Bell className="h-3 w-3" />
              {reminders.length} 项
            </Badge>
          </div>
          <div className="space-y-3">
            {reminders.map((r) => {
              const isUrgent = r.status === 'urgent';
              const isDone = r.status === 'done';
              const Icon = isDone ? CheckCircle2 : isUrgent ? AlertCircle : Clock;
              const borderColor = isUrgent
                ? 'border-l-destructive'
                : isDone
                  ? 'border-l-success'
                  : 'border-l-warning';
              const iconColor = isUrgent
                ? 'text-destructive bg-destructive/10'
                : isDone
                  ? 'text-success bg-success/10'
                  : 'text-warning bg-warning/10';
              return (
                <div
                  key={r.title}
                  className={`rounded-lg border border-border bg-card p-4 border-l-4 ${borderColor}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 常用操作快捷区 */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">常用操作</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-lg border border-border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card"
            >
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
