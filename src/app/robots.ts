import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://example.com';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/blog', '/blog/'],
      disallow: ['/api/', '/_next/', '/static/', '/login', '/blog-admin'],
    },
    sitemap: `${domain}/sitemap.xml`,
  };
}
