import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  ValidationError,
  getAuthedClient,
  getPositiveIntParam,
  toErrorResponse,
} from '@/lib/invoice-tax/api-helpers';

/**
 * 常用收款信息 列表 / 创建
 *
 * 存储用户/组织可复用的整段收款信息（银行名、账号、SWIFT 等），
 * 形式发票「收款信息」栏一次性粘贴后可保存为常用条目，后续一键复用。
 */

interface PaymentAccountRecord {
  id: string;
  title: string;
  content: string;
  is_default: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CreatePaymentAccountBody {
  title?: string;
  content?: string;
  is_default?: boolean;
  organization_id?: string | null;
}

const MAX_CONTENT_LENGTH = 5000;

function normalizeTitle(raw: unknown): string {
  const title = String(raw ?? '').trim();
  if (!title) {
    throw new ValidationError('请填写收款信息名称');
  }
  if (title.length > 200) {
    throw new ValidationError('名称过长（最多 200 字）');
  }
  return title;
}

function normalizeContent(raw: unknown): string {
  const content = String(raw ?? '').trim();
  if (!content) {
    throw new ValidationError('收款信息内容不能为空');
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ValidationError(`收款信息内容过长（最多 ${MAX_CONTENT_LENGTH} 字）`);
  }
  return content;
}

export async function GET(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);
    const limit = getPositiveIntParam(searchParams, 'limit', 50, 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0);
    const orgId = searchParams.get('organization_id');
    const search = searchParams.get('search')?.trim();

    let query = client
      .from('payment_accounts')
      .select('id, title, content, is_default, organization_id, created_at, updated_at', { count: 'exact' })
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 本人或同组织成员可见
    if (orgId) {
      query = query.or(`user_id.eq.${userId},organization_id.eq.${orgId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      data: (data ?? []) as PaymentAccountRecord[],
      total: count ?? 0,
    });
  } catch (err) {
    if (err instanceof AuthError) return toErrorResponse(err);
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, userId } = await getAuthedClient(request);
    const body = (await request.json()) as CreatePaymentAccountBody;

    const title = normalizeTitle(body.title);
    const content = normalizeContent(body.content);
    const isDefault = Boolean(body.is_default);
    const organizationId = body.organization_id ? String(body.organization_id) : null;

    // 若设为默认，先清除其他默认条目
    if (isDefault) {
      const clearQuery = client
        .from('payment_accounts')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (organizationId) {
        clearQuery.eq('organization_id', organizationId);
      }
      const { error: clearError } = await clearQuery;
      if (clearError) throw new Error(`重置默认收款信息失败: ${clearError.message}`);
    }

    const { data, error } = await client
      .from('payment_accounts')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        title,
        content,
        is_default: isDefault,
      })
      .select('id, title, content, is_default, organization_id, created_at, updated_at')
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
