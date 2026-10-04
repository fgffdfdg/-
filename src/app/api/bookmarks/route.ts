import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface CreateBookmarkBody {
  title: string;
  url: string;
  description?: string;
  category?: string;
  username?: string;
  password?: string;
  favicon_url?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const client = getSupabaseClient(token);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
    const offset = Number(searchParams.get('offset') ?? 0);

    let query = client
      .from('bookmarks')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ data: data ?? [], total: count ?? 0 });
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
    const client = getSupabaseClient(token);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 });
    }

    const body = (await request.json()) as CreateBookmarkBody;

    if (!body.title || !body.url) {
      return NextResponse.json(
        { error: '缺少必填字段: title, url' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('bookmarks')
      .insert({
        title: body.title,
        url: body.url,
        description: body.description ?? '',
        category: body.category ?? '',
        username: body.username ?? '',
        password: body.password ?? '',
        favicon_url: body.favicon_url ?? '',
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
