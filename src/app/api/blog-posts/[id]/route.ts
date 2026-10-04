import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface UpdatePostBody {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  author_name?: string;
  status?: 'draft' | 'published';
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // Try to find by id first, then by slug
    let { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!data && !error) {
      const result = await client
        .from('blog_posts')
        .select('*')
        .eq('slug', id)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    // Increment view count (fire and forget, don't block response)
    client
      .from('blog_posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', data.id)
      .then();

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdatePostBody = await request.json();
    const client = getSupabaseClient(token);

    // Check if post exists
    const { data: existing, error: checkError } = await client
      .from('blog_posts')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (checkError) throw new Error(`查询失败: ${checkError.message}`);
    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    // Check slug uniqueness if changing
    if (body.slug) {
      const { data: slugExists } = await client
        .from('blog_posts')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', id)
        .maybeSingle();

      if (slugExists) {
        return NextResponse.json({ error: `slug "${body.slug}" 已被使用` }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = { ...body };

    // Set published_at when transitioning to published
    if (body.status === 'published' && existing.status === 'draft') {
      updateData.published_at = new Date().toISOString();
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const client = getSupabaseClient(token);

    const { error } = await client
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
