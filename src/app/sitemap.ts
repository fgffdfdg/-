import { MetadataRoute } from 'next';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://example.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: domain,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${domain}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Dynamic blog post pages
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (!error && data) {
      blogPages = data.map((post: { slug: string; updated_at: string | null }) => ({
        url: `${domain}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Silently handle - sitemap should still work with static pages
  }

  return [...staticPages, ...blogPages];
}
