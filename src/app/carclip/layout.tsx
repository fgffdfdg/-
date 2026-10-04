import Link from 'next/link';
import { Scissors, Anchor, Download } from 'lucide-react';

export default function CarClipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Public Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/carclip" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">CarClip</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">Chrome 扩展</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/carclip"
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-md"
            >
              首页
            </Link>
            <a
              href="#features"
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              功能
            </a>
            <a
              href="#how-it-works"
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              使用流程
            </a>
            <a
              href="#faq"
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              常见问题
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1"
            >
              <Anchor className="h-3.5 w-3.5" />
              汽车出口通
            </Link>
            <a
              href="#"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              安装扩展
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-navy text-white/80 mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange">
                <Scissors className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">CarClip</span>
                <span className="text-xs text-white/50 ml-2">汽车出口通｜车源采集与翻译助手</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <Link href="/" className="hover:text-white transition-colors">汽车出口通</Link>
              <a href="#" className="hover:text-white transition-colors">隐私政策</a>
              <a href="#" className="hover:text-white transition-colors">使用条款</a>
              <a href="#" className="hover:text-white transition-colors">帮助中心</a>
            </div>
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} CarClip. Powered by 汽车出口通.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}