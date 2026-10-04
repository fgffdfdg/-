import type { Metadata } from 'next';
import { FaqAccordion } from './faq-accordion';
import { CopyDemoButton } from './copy-demo-button';
import { InstallButtons } from './install-buttons';
import { Clipboard, Languages, Copy, Download, Search, Zap, Chrome, ShieldCheck, Users, CheckCircle, PlayCircle, BookOpen, Check } from 'lucide-react';

export const metadata: Metadata = {
  metadataBase: new URL('https://qichechukou.cn'),
  title: 'CarClip - 汽车出口通｜车源采集与翻译助手',
  description:
    'CarClip 是专为二手车出口商打造的 Chrome 浏览器扩展。在汽车之家浏览车源时，一键提取车辆核心参数与图片，自动翻译为专业英文，省去手动整理和翻译的繁琐工作。',
  keywords: [
    'CarClip',
    '车源采集',
    '汽车之家提取',
    '二手车翻译',
    '二手车出口',
    'Chrome扩展',
    '汽车出口通',
    '车辆信息提取',
    '英文翻译',
    '外贸车源',
  ],
  openGraph: {
    title: 'CarClip - 一键提取二手车信息，秒变英文发给客户',
    description:
      '专为二手车出口商打造的 Chrome 扩展，在汽车之家浏览车源时一键提取核心信息+图片，自动翻译英文。',
    url: 'https://qichechukou.cn/carclip',
    siteName: '汽车出口通',
    images: [
      {
        url: '/og-carclip.png',
        width: 1200,
        height: 630,
        alt: 'CarClip - 车源采集与翻译助手',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarClip - 一键提取二手车信息，秒变英文发给客户',
    description:
      '专为二手车出口商打造的 Chrome 扩展，在汽车之家浏览车源时一键提取核心信息+图片，自动翻译英文。',
    images: ['/og-carclip.png'],
  },
  alternates: {
    canonical: 'https://qichechukou.cn/carclip',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

export default function CarClipPage() {
  return (
    <>
      {/* ===== Hero 区域 ===== */}
      <section className="px-4 md:px-6 pt-20 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 bg-navy-light/10 text-navy-light dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium w-fit">
                <Zap className="h-3.5 w-3.5" />
                汽车出口通旗下产品
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-foreground">
                一键提取二手车信息，
                <br />
                <span className="text-primary">秒变英文</span>发给客户
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                CarClip
                是专为二手车出口商打造的 Chrome
                浏览器扩展。在汽车之家浏览车源时，一键提取车辆核心参数与图片，自动翻译为专业英文，省去手动整理和翻译的繁琐工作。
              </p>
              <div className="flex items-center gap-4 pt-2">
                <InstallButtons type="hero" />
                <button className="bg-muted text-foreground px-6 py-3 rounded-md text-sm font-medium hover:bg-muted/80 active:scale-[0.98] transition-all inline-flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />观看演示
                </button>
              </div>
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Chrome className="h-3.5 w-3.5" />Chrome 浏览器
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  安全可靠
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  2,000+ 外贸车商在用
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="bg-card rounded-xl shadow-float overflow-hidden border border-border/20">
                <div className="bg-muted px-4 py-2.5 flex items-center gap-2 border-b border-border/20">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    autohome.com.cn — 二手车详情页
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                      <ScissorsTag className="h-3 w-3 text-primary-foreground" />
                    </span>
                  </div>
                </div>
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-muted/60 rounded-xl flex items-center justify-center mb-3">
                      <Chrome className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CarClip 扩展在汽车之家页面上运行
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-card rounded-lg shadow-card px-4 py-3 border border-border/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-foreground">
                    提取完成，英文已就绪
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 核心功能亮点区域 ===== */}
      <section id="features" className="px-4 md:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">核心功能</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              三个步骤，让二手车信息从中文网页直达海外客户手中
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 功能卡片1：一键提取 */}
            <div className="bg-card rounded-xl shadow-card p-6 flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clipboard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">一键提取</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                在汽车之家任意二手车详情页，点击扩展图标即可自动提取车型、年份、里程、排量、变速箱、价格等核心参数，无需手动复制粘贴。
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />车型·年份·里程
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />排量·变速箱·排放标准
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />价格·车辆图片
                </li>
              </ul>
            </div>
            {/* 功能卡片2：智能翻译 */}
            <div className="bg-card rounded-xl shadow-card p-6 flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">智能翻译</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                提取的信息自动翻译为专业英文术语。内置汽车行业术语库，确保「自动变速箱」→「Automatic
                Transmission」、「涡轮增压」→「Turbocharged」等翻译准确、地道。
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />专业汽车术语库
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />AI 辅助翻译引擎
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />海外买家一看就懂
                </li>
              </ul>
            </div>
            {/* 功能卡片3：一键复制 */}
            <div className="bg-card rounded-xl shadow-card p-6 flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Copy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">一键复制</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                提取并翻译后的英文信息以格式化卡片展示，一键复制即可粘贴到 WhatsApp、WeChat、Email
                等渠道发送给海外客户，告别手动排版。
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />格式化展示
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />一键复制全文
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-success" />
                  支持 WhatsApp/WeChat/Email
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 使用流程区域 ===== */}
      <section id="how-it-works" className="px-4 md:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">使用流程</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              安装扩展后，在汽车之家浏览车源时即可一键使用，无需额外操作
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 步骤1 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-card">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">安装扩展</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                从 Chrome 应用商店搜索 CarClip
                并安装，或点击本页面「安装扩展」按钮一键跳转。
              </p>
            </div>
            {/* 步骤2 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-card">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">浏览车源</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                在汽车之家（autohome.com.cn）二手车频道浏览车源，找到感兴趣的车辆后进入详情页。
              </p>
            </div>
            {/* 步骤3 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-card">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">一键提取</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                点击浏览器工具栏中的 CarClip
                扩展图标，车辆信息与图片自动提取并翻译为英文，一键复制发送。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 效果展示区域 ===== */}
      <section id="demo" className="px-4 md:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">效果对比</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              左边是汽车之家原始中文页面，右边是 CarClip 提取后的英文格式化信息
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* 左侧：原始中文页面 */}
            <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/20">
              <div className="bg-muted px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive/70" />
                <span className="w-2 h-2 rounded-full bg-warning/70" />
                <span className="w-2 h-2 rounded-full bg-success/70" />
                <span className="text-xs text-muted-foreground ml-2">
                  汽车之家 - 二手车详情页
                </span>
              </div>
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto bg-muted/60 rounded-lg flex items-center justify-center mb-2">
                    <Search className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    原始中文页面，信息散落各处
                  </p>
                </div>
              </div>
              <div className="p-3 bg-muted/50 border-t border-border/20">
                <p className="text-xs text-muted-foreground text-center">
                  ← 原始中文页面，信息散落各处
                </p>
              </div>
            </div>
            {/* 右侧：CarClip 提取结果 */}
            <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border/20">
              <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
                <ScissorsTag className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">
                  CarClip — Extracted Vehicle Info
                </span>
                <CopyDemoButton />
              </div>
              <div className="p-5 space-y-4">
                {/* 车辆基本信息 */}
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    2023 Toyota Land Cruiser 4.0L GXR
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Extracted from autohome.com.cn
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Year</span>
                    <p className="text-sm font-semibold text-foreground">2023</p>
                  </div>
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Mileage</span>
                    <p className="text-sm font-semibold text-foreground">
                      28,000 km
                    </p>
                  </div>
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      Displacement
                    </span>
                    <p className="text-sm font-semibold text-foreground">4.0L</p>
                  </div>
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      Transmission
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      Automatic
                    </p>
                  </div>
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      Emission Standard
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      Euro VI
                    </p>
                  </div>
                  <div className="bg-muted rounded-md px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <p className="text-sm font-semibold text-primary">$68,500</p>
                  </div>
                </div>
                {/* 缩略图 */}
                <div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Vehicle Images (5)
                  </span>
                  <div className="flex gap-2 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-16 h-12 rounded-md bg-muted flex items-center justify-center"
                      >
                        <span className="text-[10px] text-muted-foreground/50">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 常见问题区域 ===== */}
      <section id="faq" className="px-4 md:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">常见问题</h2>
            <p className="text-sm text-muted-foreground mt-2">
              关于 CarClip 的常见疑问，这里都有答案
            </p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ===== CTA 底部号召区域 ===== */}
      <section className="px-4 md:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-primary rounded-2xl shadow-float overflow-hidden">
            <div className="px-8 py-12 md:py-16 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">
                准备好提升外贸效率了吗？
              </h2>
              <p className="text-sm text-primary-foreground/80 mt-3 leading-relaxed max-w-md mx-auto">
                每天有 2,000+ 外贸车商使用 CarClip
                快速整理车源信息。安装扩展，让每一条车源信息都能快速触达海外客户。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <InstallButtons type="cta" />
                <button className="border border-primary-foreground/30 text-primary-foreground px-6 py-3 rounded-md text-sm font-medium hover:bg-primary-foreground/10 active:scale-[0.98] transition-all inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />查看使用文档
                </button>
              </div>
              <p className="text-xs text-primary-foreground/60 mt-6">
                适用于 Chrome 浏览器 · 基础功能免费 · 无需注册即可使用
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Scissors 图标的小型版本，用于装饰 */
function ScissorsTag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}