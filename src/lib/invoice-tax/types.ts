// 发票 / 报税模块共享类型

export type InvoiceTitleType = 'own_company' | 'partner';

export type TaxBureauSiteType = 'national' | 'provincial' | 'business_system';

export interface InvoiceTitle {
  id: string;
  user_id: string;
  organization_id: string | null;
  title_type: InvoiceTitleType;
  company_name: string;
  company_name_en: string | null;
  tax_id: string | null;
  overseas_tax_id: string | null;
  address: string | null;
  address_en: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account: string | null;
  contact_name: string | null;
  contact_email: string | null;
  country: string | null;
  city: string | null;
  shipping_address: string | null;
  tags: string[];
  remark: string | null;
  is_default: boolean;
  sort_order: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTitleInput {
  title_type: InvoiceTitleType;
  company_name: string;
  company_name_en?: string | null;
  tax_id?: string | null;
  overseas_tax_id?: string | null;
  address?: string | null;
  address_en?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  country?: string | null;
  city?: string | null;
  shipping_address?: string | null;
  tags?: string[];
  remark?: string | null;
  is_default?: boolean;
  organization_id?: string | null;
}

export interface TaxBureauFavorite {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  url: string;
  site_type: TaxBureauSiteType;
  region: string;
  description: string | null;
  business_tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaxBureauFavoriteInput {
  name: string;
  url: string;
  site_type: TaxBureauSiteType;
  region?: string;
  description?: string | null;
  business_tags?: string[];
  organization_id?: string | null;
}

export const INVOICE_TITLE_TYPE_LABELS: Record<InvoiceTitleType, string> = {
  own_company: '本公司',
  partner: '合作方',
};

export const TAX_BUREAU_SITE_TYPE_LABELS: Record<TaxBureauSiteType, string> = {
  national: '国家级',
  provincial: '省市电子税务局',
  business_system: '业务系统',
};

// 内置推荐税务局清单（用户可一键收藏到 tax_bureau_favorites）
export const PRESET_TAX_BUREAUS: TaxBureauFavoriteInput[] = [
  {
    name: '国家税务总局',
    url: 'https://www.chinatax.gov.cn',
    site_type: 'national',
    region: '全国',
    description: '税收政策、纳税服务、通知公告官方入口',
    business_tags: ['政策查询', '纳税服务'],
  },
  {
    name: '全国增值税发票查验平台',
    url: 'https://inv-veri.chinatax.gov.cn',
    site_type: 'business_system',
    region: '全国',
    description: '增值税专用发票、普通发票、电子发票真伪查验',
    business_tags: ['发票查验'],
  },
  {
    name: '增值税发票综合服务平台',
    url: 'https://fpdk.chinatax.gov.cn',
    site_type: 'business_system',
    region: '全国',
    description: '发票勾选确认、退税勾选、进项税额管理',
    business_tags: ['发票勾选', '进项管理'],
  },
  {
    name: '出口退税申报系统',
    url: 'https://etax.chinatax.gov.cn',
    site_type: 'business_system',
    region: '全国',
    description: '出口退（免）税申报、单证备案与进度查询',
    business_tags: ['出口退税', '单证备案'],
  },
  {
    name: '广东省电子税务局',
    url: 'https://etax.guangdong.chinatax.gov.cn',
    site_type: 'provincial',
    region: '广东',
    description: '广东省纳税申报、发票业务、出口退税在线办理',
    business_tags: ['纳税申报', '发票开具', '出口退税'],
  },
  {
    name: '浙江省电子税务局',
    url: 'https://etax.zhejiang.chinatax.gov.cn',
    site_type: 'provincial',
    region: '浙江',
    description: '浙江省网上办税、发票代开、退税申报',
    business_tags: ['纳税申报', '发票开具'],
  },
  {
    name: '宁波市电子税务局',
    url: 'https://etax.ningbo.chinatax.gov.cn',
    site_type: 'provincial',
    region: '浙江',
    description: '宁波口岸出口企业常用办税入口',
    business_tags: ['纳税申报', '出口退税'],
  },
  {
    name: '深圳市电子税务局',
    url: 'https://etax.shenzhen.chinatax.gov.cn',
    site_type: 'provincial',
    region: '广东',
    description: '深圳盐田/蛇口口岸出口企业办税入口',
    business_tags: ['纳税申报', '出口退税'],
  },
  {
    name: '山东省电子税务局',
    url: 'https://etax.shandong.chinatax.gov.cn',
    site_type: 'provincial',
    region: '山东',
    description: '山东省纳税申报、发票业务在线办理',
    business_tags: ['纳税申报', '发票开具'],
  },
  {
    name: '江苏省电子税务局',
    url: 'https://etax.jiangsu.chinatax.gov.cn',
    site_type: 'provincial',
    region: '江苏',
    description: '江苏省企业网上办税服务厅',
    business_tags: ['纳税申报', '发票开具'],
  },
];
