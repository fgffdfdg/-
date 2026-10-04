import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function BlogNotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <FileText className="h-16 w-16 mx-auto text-muted-foreground/30" />
      <h1 className="mt-6 text-2xl font-bold text-navy">文章未找到</h1>
      <p className="mt-2 text-muted-foreground">
        您访问的文章不存在或已被移除。
      </p>
      <Link
        href="/blog"
        className="mt-6 inline-flex items-center gap-2 text-sm text-orange hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        返回博客列表
      </Link>
    </div>
  );
}
