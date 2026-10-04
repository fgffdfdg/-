import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 从请求中提取 Bearer token 并返回已认证的 Supabase 客户端 + 当前 user。
 * 未登录或 token 无效时抛出错误，由调用方转换为 401。
 */
export async function getAuthedClient(
  request: NextRequest,
): Promise<{ client: ReturnType<typeof getSupabaseClient>; userId: string }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthError('未授权，请先登录', 401);
  }
  const client = getSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    throw new AuthError('用户认证失败', 401);
  }
  return { client, userId: user.id };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/** 客户端入参校验错误（400），区别于服务端异常（500） */
export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AuthError || err instanceof ValidationError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  return Response.json({ error: message }, { status: 500 });
}

export function getPositiveIntParam(
  searchParams: URLSearchParams,
  name: string,
  fallback: number,
  max: number,
): number {
  const raw = Number(searchParams.get(name));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), max);
}
