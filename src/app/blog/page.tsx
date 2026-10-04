import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Calendar, Eye, Tag, ArrowRight } from 'lucide-react';

const DOMAIN = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://qichechukou.cn';

export const metadata: Metadata = {
  title: '博客 - 二手车出口行业资讯与实操指南 | 汽车出口通',
  description: '分享二手车出口行业动态、目标市场准入政策解读、出口实操经验、报关清关技巧、国际物流指南等专业内容，助力车商高效开展二手车出口业务。',
  keywords: ['二手车出口博客', '出口行业资讯', '准入政策解读', '报关清关指南', '国际物流', '二手车外贸'],
  openGraph: {
    title: '博客 - 二手车出口行业资讯与实操指南',
    description: '二手车出口行业动态、政策解读、实操经验分享，助力车商高效开展出口业务。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '汽车出口通',
    url: `${DOMAIN}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '博客 - 二手车出口行业资讯与实操指南',
    description: '二手车出口行业动态、政策解读、实操经验分享。',
  },
  alternates: {
    canonical: `${DOMAIN}/blog`,
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  author_name: string;
  tags: string[];
  view_count: number;
  published_at: string | null;
}

async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, author_name, tags, view_count, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []) as BlogPost[];
  } catch {
    return [];
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

export default async function BlogListPage() {
  const posts = await getPublishedPosts();
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://example.com';

  // JSON-LD structured data for blog
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: '汽车出口通博客',
    description: '二手车出口行业资讯与实操指南',
    url: `${domain}/blog`,
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${domain}/blog/${post.slug}`,
      datePublished: post.published_at,
      author: {
        '@type': 'Organization',
        name: post.author_name,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            二手车出口行业资讯
          </h1>
          <p className="text-lg text-white/70 max-w-2xl">
            深度解读目标市场准入政策、分享出口实操经验、提供报关清关与国际物流专业指南，助力车商高效开展二手车出口业务。
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">暂无已发布的文章</p>
            <p className="text-sm text-muted-foreground mt-2">请稍后再来查看最新内容</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group rounded-xl border border-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {post.cover_image && (
                  <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      width={400}
                      height={192}
                    />
                  </Link>
                )}
                <div className="p-5">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-navy/5 text-navy/70"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-navy mb-2 line-clamp-2 group-hover:text-orange transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(post.published_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {post.view_count}
                      </span>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex items-center gap-1 text-orange font-medium hover:underline"
                    >
                      阅读
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
