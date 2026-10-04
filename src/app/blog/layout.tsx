import Link from 'next/link';
import { Anchor } from 'lucide-react';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Public Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange">
              <Anchor className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">汽车出口通</span>
              <span className="text-xs text-muted-foreground ml-2">博客</span>
            </div>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/blog" className="text-sm font-medium text-foreground hover:text-orange transition-colors">
              文章
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              回到工作台
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-navy text-white/80 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange">
                  <Anchor className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-white">汽车出口通</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                二手车出口全链条工具平台，提供车辆核验、单证模板、运费测算、准入政策等专业工具与资讯。
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">快速链接</h4>
              <div className="space-y-2">
                <Link href="/" className="block text-xs text-white/60 hover:text-white transition-colors">工作台</Link>
                <Link href="/blog" className="block text-xs text-white/60 hover:text-white transition-colors">博客文章</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">热门主题</h4>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">二手车出口</span>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">报关清关</span>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">国际物流</span>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">准入政策</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} 汽车出口通 - 二手车出口全链条工具平台
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
