import type { Metadata } from 'next';
import Script from 'next/script';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from 'sonner';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context';
import { OrgProvider } from '@/lib/org/context';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';
import './globals.css';

const DOMAIN = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://qichechukou.cn';

export const metadata: Metadata = {
  metadataBase: new URL(DOMAIN),
  title: {
    default: '汽车出口通 - 二手车出口专业工具平台',
    template: '%s | 汽车出口通',
  },
  description: '汽车出口通 - 二手车出口专业工具平台，提供车辆核验、单证制作、运费测算、准入政策、报关清关、国际物流等一站式服务，助力车商高效开展二手车出口业务。',
  keywords: ['汽车出口通', '二手车出口', '车辆核验', '报关清关', '运费测算', '准入政策', '国际物流', '单证模板'],
  authors: [{ name: '汽车出口通' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '汽车出口通',
    title: '汽车出口通 - 二手车出口专业工具平台',
    description: '提供车辆核验、单证制作、运费测算、准入政策等一站式服务，助力车商高效开展二手车出口业务。',
    url: DOMAIN,
  },
  twitter: {
    card: 'summary_large_image',
    title: '汽车出口通 - 二手车出口专业工具平台',
    description: '提供车辆核验、单证制作、运费测算、准入政策等一站式服务，助力车商高效开展二手车出口业务。',
  },
  alternates: {
    canonical: DOMAIN,
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  other: {
    'baidu-site-verification': 'codeva-25T7FNWD1s',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  // 方案A: 服务端直接读取 Supabase 配置，内联注入到 HTML，消除客户端 fetch 往返
  let supabaseConfigScript = '';
  try {
    const { url, anonKey } = getSupabaseCredentials();
    if (url && anonKey) {
      supabaseConfigScript = `window.__SUPABASE_CONFIG__=${JSON.stringify({ url, anonKey })};window.dispatchEvent(new CustomEvent('supabase-config-ready',{detail:window.__SUPABASE_CONFIG__}));`;
    }
  } catch {
    // 配置不可用时降级为客户端 fetch（SupabaseConfigProvider 兜底）
  }

  // Organization JSON-LD structured data
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '汽车出口通',
    url: DOMAIN,
    description: '二手车出口全链条工具平台，提供车辆核验、单证制作、运费测算、准入政策等一站式服务。',
    sameAs: [
      `${DOMAIN}/blog`,
      `${DOMAIN}/carclip`,
    ],
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`}>
        {supabaseConfigScript && (
          <Script id="supabase-config-inline" strategy="beforeInteractive">
            {supabaseConfigScript}
          </Script>
        )}
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ThemeProvider>
          <SupabaseConfigProvider>
            <AuthProvider>
              <OrgProvider>
                {isDev && <Inspector />}
                {children}
                <Toaster position="top-center" richColors />
              </OrgProvider>
            </AuthProvider>
          </SupabaseConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
