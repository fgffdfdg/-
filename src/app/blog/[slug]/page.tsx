import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Calendar, Eye, User, Tag, ArrowLeft } from 'lucide-react';

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author_name: string;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

async function getPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data as BlogPostDetail | null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: '文章未找到 - 汽车出口通博客' };
  }

  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://example.com';
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || '';

  return {
    title: `${title} | 汽车出口通`,
    description,
    keywords: [...(post.tags || []), '二手车出口', '汽车出口通'],
    authors: [{ name: post.author_name }],
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.created_at || undefined,
      authors: [post.author_name],
      tags: post.tags || [],
      locale: 'zh_CN',
      siteName: '汽车出口通',
      images: post.cover_image ? [{ url: post.cover_image, alt: post.title }] : [],
      url: `${domain}/blog/${slug}`,
    },
    twitter: {
      card: post.cover_image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: post.cover_image ? [post.cover_image] : [],
    },
    alternates: {
      canonical: `${domain}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://example.com';

  // Article JSON-LD structured data
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.meta_description || '',
    image: post.cover_image || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.created_at || undefined,
    author: {
      '@type': 'Organization',
      name: post.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: '汽车出口通',
      url: domain,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${domain}/blog/${slug}`,
    },
    keywords: (post.tags || []).join(', '),
  };

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: domain,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '博客',
        item: `${domain}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-navy transition-colors">首页</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-navy transition-colors">博客</Link>
            <span>/</span>
            <span className="text-navy truncate max-w-[200px]">{post.title}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-10">
        {/* Article Header */}
        <header className="mb-8">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-navy/5 text-navy/70 border border-navy/10"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-navy leading-tight mb-4">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.published_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.view_count} 次阅读
            </span>
          </div>
        </header>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-auto max-h-96 object-cover"
              width={800}
              height={400}
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:text-navy prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-strong:text-navy prose-img:rounded-lg prose-blockquote:border-orange prose-blockquote:bg-orange/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-code:text-orange prose-code:bg-orange/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-li:marker:text-navy prose-table:border-collapse prose-th:bg-navy/5 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-border"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回博客列表
            </Link>
          </div>
        </footer>
      </article>
    </>
  );
}
