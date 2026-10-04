import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface CreatePostBody {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  author_name?: string;
  status?: 'draft' | 'published';
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  published_at?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200) || `post-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const offset = Number(searchParams.get('offset') ?? 0);
    const status = searchParams.get('status');
    const tag = searchParams.get('tag');

    let query = client
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, author_name, status, tags, meta_title, meta_description, view_count, published_at, created_at, updated_at', { count: 'exact' })
      .order('published_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ data, total: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const body: CreatePostBody = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const client = getSupabaseClient(token);

    const slug = body.slug || generateSlug(body.title);

    // Check slug uniqueness
    const { data: existing } = await client
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `slug "${slug}" 已被使用，请更换` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const postData = {
      title: body.title,
      slug,
      excerpt: body.excerpt || '',
      content: body.content,
      cover_image: body.cover_image || null,
      author_name: body.author_name || '汽车出口通',
      status: body.status || 'draft',
      tags: body.tags || [],
      meta_title: body.meta_title || body.title,
      meta_description: body.meta_description || body.excerpt || '',
      published_at: body.status === 'published' ? (body.published_at || now) : null,
    };

    const { data, error } = await client
      .from('blog_posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
