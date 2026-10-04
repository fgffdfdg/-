import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  ValidationError,
  getAuthedClient,
  toErrorResponse,
} from '@/lib/invoice-tax/api-helpers';

/**
 * 常用收款信息 详情 / 更新 / 删除
 */

interface UpdatePaymentAccountBody {
  title?: string;
  content?: string;
  is_default?: boolean;
}

const MAX_CONTENT_LENGTH = 5000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client } = await getAuthedClient(request);

    const { data, error } = await client
      .from('payment_accounts')
      .select('id, title, content, is_default, organization_id, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '收款信息不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client, userId } = await getAuthedClient(request);
    const body = (await request.json()) as UpdatePaymentAccountBody;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) throw new ValidationError('请填写收款信息名称');
      if (title.length > 200) throw new ValidationError('名称过长（最多 200 字）');
      updateData.title = title;
    }
    if (body.content !== undefined) {
      const content = String(body.content).trim();
      if (!content) throw new ValidationError('收款信息内容不能为空');
      if (content.length > MAX_CONTENT_LENGTH) {
        throw new ValidationError(`收款信息内容过长（最多 ${MAX_CONTENT_LENGTH} 字）`);
      }
      updateData.content = content;
    }

    // 先确认记录存在且属于当前用户
    const { data: existing, error: fetchError } = await client
      .from('payment_accounts')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw new Error(`查询失败: ${fetchError.message}`);
    if (!existing) {
      return NextResponse.json({ error: '收款信息不存在或无权修改' }, { status: 404 });
    }

    if (body.is_default !== undefined) {
      updateData.is_default = Boolean(body.is_default);
      // 设为默认时清除其他默认条目
      if (body.is_default) {
        const { error: clearError } = await client
          .from('payment_accounts')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .neq('id', id);
        if (clearError) throw new Error(`重置默认收款信息失败: ${clearError.message}`);
      }
    }

    const { data, error } = await client
      .from('payment_accounts')
      .update(updateData)
      .eq('id', id)
      .select('id, title, content, is_default, organization_id, created_at, updated_at')
      .maybeSingle();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '收款信息不存在或无权修改' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client, userId } = await getAuthedClient(request);

    const { data: existing, error: fetchError } = await client
      .from('payment_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw new Error(`查询失败: ${fetchError.message}`);
    if (!existing) {
      return NextResponse.json({ error: '收款信息不存在' }, { status: 404 });
    }

    const { error } = await client
      .from('payment_accounts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}
