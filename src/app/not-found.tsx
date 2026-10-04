import type { Metadata } from 'next';
import Link from 'next/link';
import { Anchor, ArrowLeft, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: '页面未找到 - 汽车出口通',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy">
            <Anchor className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">汽车出口通</span>
        </Link>

        {/* 404 Message */}
        <h1 className="text-6xl font-bold text-navy mb-4">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">页面未找到</h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          您访问的页面可能已被移除、链接已过期，或输入的地址有误。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <Search className="h-4 w-4" />
            浏览博客
          </Link>
        </div>
      </div>
    </div>
  );
}