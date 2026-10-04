'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createInvoiceTitle,
  updateInvoiceTitle,
  listInvoiceTitles,
} from '@/lib/invoice-tax/client';
import type { InvoiceTitleInput, InvoiceTitleType } from '@/lib/invoice-tax/types';

const TAG_OPTIONS = [
  '默认抬头',
  '海外买家',
  '国内供应商',
  '物流商',
  '长期合作',
  '临时客户',
];

const COUNTRIES = [
  '中国',
  '阿联酋',
  '吉尔吉斯斯坦',
  '哈萨克斯坦',
  '俄罗斯',
  '沙特阿拉伯',
  '塔吉克斯坦',
  '乌兹别克斯坦',
  '其他',
];

const TYPE_CARDS: { key: InvoiceTitleType; label: string; desc: string }[] = [
  {
    key: 'own_company',
    label: '本公司',
    desc: '我方企业作为销售方/开票方，用于出口商业发票、形式发票等单据的卖方信息。建议优先设置一个默认本公司抬头。',
  },
  {
    key: 'partner',
    label: '合作方',
    desc: '海外买家或国内供应商作为购买方/收货方，用于发票购买方栏位或采购发票管理。',
  },
];

type FormState = {
  title_type: InvoiceTitleType;
  company_name: string;
  company_name_en: string;
  tax_id: string;
  overseas_tax_id: string;
  address: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  contact_name: string;
  contact_email: string;
  country: string;
  city: string;
  shipping_address: string;
  tags: string[];
  remark: string;
  is_default: boolean;
};

const EMPTY_FORM: FormState = {
  title_type: 'own_company',
  company_name: '',
  company_name_en: '',
  tax_id: '',
  overseas_tax_id: '',
  address: '',
  phone: '',
  bank_name: '',
  bank_account: '',
  contact_name: '',
  contact_email: '',
  country: '中国',
  city: '',
  shipping_address: '',
  tags: [],
  remark: '',
  is_default: false,
};

export default function InvoiceTitleFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, loading: authLoading } = useAuth();
  const { organization } = useOrg();

  const editId = searchParams.get('id');
  const presetType = searchParams.get('type') as InvoiceTitleType | null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (presetType === 'own_company' || presetType === 'partner') {
      setForm((prev) => ({ ...prev, title_type: presetType }));
    }
  }, [presetType]);

  useEffect(() => {
    if (authLoading || !token || !editId) return;
    let cancelled = false;
    (async () => {
      try {
        // token 来自 useAuth()
        const res = await listInvoiceTitles(token, {
          organizationId: organization?.id ?? null,
          limit: 200,
        });
        const target = res.data.find((i) => i.id === editId);
        if (target && !cancelled) {
          setForm({
            title_type: target.title_type,
            company_name: target.company_name,
            company_name_en: target.company_name_en ?? '',
            tax_id: target.tax_id ?? '',
            overseas_tax_id: target.overseas_tax_id ?? '',
            address: target.address ?? '',
            phone: target.phone ?? '',
            bank_name: target.bank_name ?? '',
            bank_account: target.bank_account ?? '',
            contact_name: target.contact_name ?? '',
            contact_email: target.contact_email ?? '',
            country: target.country ?? '中国',
            city: target.city ?? '',
            shipping_address: target.shipping_address ?? '',
            tags: target.tags ?? [],
            remark: target.remark ?? '',
            is_default: target.is_default ?? false,
          });
        }
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : '加载抬头失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token, editId, organization?.id, showToast]);

  const isPartner = form.title_type === 'partner';
  const isOverseas = useMemo(
    () => isPartner && form.country && form.country !== '中国',
    [isPartner, form.country],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    }
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.company_name.trim()) next.company_name = '请填写公司/个人名称';
    if (form.title_type === 'own_company' && !form.tax_id.trim()) {
      next.tax_id = '本公司抬头必须填写统一社会信用代码';
    }
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      next.contact_email = '邮箱格式不正确';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): InvoiceTitleInput => ({
    title_type: form.title_type,
    company_name: form.company_name.trim(),
    company_name_en: form.company_name_en.trim() || null,
    tax_id: form.tax_id.trim() || null,
    overseas_tax_id: form.overseas_tax_id.trim() || null,
    address: form.address.trim() || null,
    phone: form.phone.trim() || null,
    bank_name: form.bank_name.trim() || null,
    bank_account: form.bank_account.trim() || null,
    contact_name: form.contact_name.trim() || null,
    contact_email: form.contact_email.trim() || null,
    country: form.country,
    city: form.city.trim() || null,
    shipping_address: form.shipping_address.trim() || null,
    tags: form.tags,
    remark: form.remark.trim() || null,
    is_default: form.title_type === 'own_company' ? form.is_default : false,
    organization_id: organization?.id ?? null,
  });

  const handleSave = async (andNew = false) => {
    if (!validate()) {
      showToast('请检查必填项');
      return;
    }
    setSubmitting(true);
    try {
      // token 来自 useAuth()
      const payload = buildPayload();
      if (editId) {
        await updateInvoiceTitle(token, editId, payload);
        showToast('抬头已更新');
      } else {
        await createInvoiceTitle(token, payload);
        showToast('抬头已保存');
      }
      if (andNew) {
        setForm({ ...EMPTY_FORM, title_type: form.title_type });
      } else {
        setTimeout(() => router.push('/invoice-titles'), 600);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">加载抬头信息中...</div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* 标题区 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoice-titles">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              返回列表
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {editId ? '编辑发票抬头' : '新增发票抬头'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              录入本公司或合作方的开票信息，保存后可在形式发票、商业发票等单据中快速调用
            </p>
          </div>
        </div>
      </div>

      {/* 抬头类型选择 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TYPE_CARDS.map((card) => {
          const active = form.title_type === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => update('title_type', card.key)}
              className={`rounded-lg border p-4 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? 'border-primary' : 'border-muted-foreground/50'
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span className="text-base font-semibold text-foreground">{card.label}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* 表单区 */}
        <div className="space-y-5">
          {/* 基本信息 */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">基本信息</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="公司/个人名称" required error={errors.company_name} className="sm:col-span-2">
                <Input
                  value={form.company_name}
                  onChange={(e) => update('company_name', e.target.value)}
                  placeholder={isPartner ? '如：Dubai Al Futtaim Motors LLC' : '如：深圳市远扬汽车出口贸易有限公司'}
                />
              </Field>
              {isPartner && (
                <Field label="英文名称" className="sm:col-span-2">
                  <Input
                    value={form.company_name_en}
                    onChange={(e) => update('company_name_en', e.target.value)}
                    placeholder="English name (optional)"
                  />
                </Field>
              )}
              <Field
                label={isOverseas ? '统一社会信用代码（可留空）' : '纳税人识别号/统一社会信用代码'}
                required={form.title_type === 'own_company'}
                error={errors.tax_id}
              >
                <Input
                  value={form.tax_id}
                  onChange={(e) => update('tax_id', e.target.value)}
                  placeholder={isOverseas ? '境外企业可留空' : '18 位社会信用代码'}
                  className="font-mono"
                />
              </Field>
              {isOverseas && (
                <Field label="海外税号 / VAT / TRN">
                  <Input
                    value={form.overseas_tax_id}
                    onChange={(e) => update('overseas_tax_id', e.target.value)}
                    placeholder="如：100-2019-5001"
                    className="font-mono"
                  />
                </Field>
              )}
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block text-sm">类型标签</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
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
              <Field label="备注" className="sm:col-span-2">
                <Textarea
                  value={form.remark}
                  onChange={(e) => update('remark', e.target.value)}
                  placeholder="如：迪拜长期合作买家，主要采购日系 SUV，付款方式 T/T 30% 定金"
                  rows={3}
                />
              </Field>
            </div>
          </section>

          {/* 联系方式与地址 */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">联系方式与地址</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="注册地址" className="sm:col-span-2">
                <Input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="详细注册地址"
                />
              </Field>
              <Field label="联系电话">
                <Input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="如：0755-2520XXXX / +971 4 295-XXXX"
                />
              </Field>
              <Field label="联系人姓名">
                <Input
                  value={form.contact_name}
                  onChange={(e) => update('contact_name', e.target.value)}
                  placeholder="如：Ahmed Al Futtaim"
                />
              </Field>
              <Field label="电子邮箱" error={errors.contact_email}>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="purchase@example.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">用于接收电子版发票</p>
              </Field>
              <Field label="开户银行">
                <Input
                  value={form.bank_name}
                  onChange={(e) => update('bank_name', e.target.value)}
                  placeholder="如：中国银行深圳盐田支行 / Emirates NBD Bank"
                />
              </Field>
              <Field label="银行账号">
                <Input
                  value={form.bank_account}
                  onChange={(e) => update('bank_account', e.target.value)}
                  placeholder="银行账号"
                  className="font-mono"
                />
              </Field>
            </div>
          </section>

          {/* 海外信息 */}
          {isPartner && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                海外信息
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  （合作方/海外买家可选填）
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="国家/地区">
                  <Select value={form.country} onValueChange={(v) => update('country', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="城市 / 港口">
                  <Input
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="如：Dubai / Jebel Ali"
                  />
                </Field>
                <Field label="收货地址" className="sm:col-span-2">
                  <Textarea
                    value={form.shipping_address}
                    onChange={(e) => update('shipping_address', e.target.value)}
                    placeholder="海外收货详细地址"
                    rows={2}
                  />
                </Field>
              </div>
            </section>
          )}
        </div>

        {/* 右侧预览 */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">发票抬头预览</h3>
            </div>
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
              <div className="mb-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${
                    isPartner
                      ? 'bg-warning/15 text-warning'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isPartner ? '购买方 / Buyer' : '销售方 / Seller'}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {form.company_name || '（公司名称）'}
              </p>
              {form.company_name_en && (
                <p className="mt-0.5 text-xs text-muted-foreground">{form.company_name_en}</p>
              )}
              <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {form.tax_id && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">税号：</dt>
                    <dd className="font-mono text-foreground/80">{form.tax_id}</dd>
                  </div>
                )}
                {form.overseas_tax_id && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">VAT/TRN：</dt>
                    <dd className="font-mono text-foreground/80">{form.overseas_tax_id}</dd>
                  </div>
                )}
                {form.address && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">地址：</dt>
                    <dd>{form.address}</dd>
                  </div>
                )}
                {form.phone && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">电话：</dt>
                    <dd>{form.phone}</dd>
                  </div>
                )}
                {form.bank_name && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">开户行：</dt>
                    <dd>{form.bank_name}</dd>
                  </div>
                )}
                {form.bank_account && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">账号：</dt>
                    <dd className="font-mono text-foreground/80">{form.bank_account}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">填写提示</h3>
            </div>
            <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
              <li>中国企业请填写 18 位统一社会信用代码；境外合作方可填写当地税号或留空。</li>
              <li>本公司抬头建议填写完整，确保发票/报关单据信息一致。</li>
              <li>合作方如为海外买家，请补充国家、港口与收货地址。</li>
              <li>标签用于快速分类与检索，可多选。</li>
            </ol>
          </div>
        </aside>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div>
            {form.title_type === 'own_company' ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={form.is_default}
                  onCheckedChange={(v) => update('is_default', v === true)}
                />
                设为默认本公司抬头
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                合作方抬头将作为购买方信息，用于形式发票 / 商业发票的买方栏位
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/invoice-titles">取消</Link>
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={submitting}>
              保存并新增
            </Button>
            <Button onClick={() => handleSave(false)} disabled={submitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {submitting ? '保存中...' : editId ? '保存修改' : '保存抬头'}
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 right-6 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
