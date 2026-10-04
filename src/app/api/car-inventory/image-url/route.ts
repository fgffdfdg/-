import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage } from '@/lib/s3';

/**
 * GET /api/car-inventory/image-url?key=xxx
 * POST /api/car-inventory/image-url?key=xxx 或 body: { key }
 * 根据 S3 key 生成签名 URL（1 小时有效），供前端预览图片。
 */
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    // 优先从 query 取，其次从 POST body 取
    const { searchParams } = new URL(request.url);
    let key = searchParams.get('key');

    if (!key && request.method === 'POST') {
      try {
        const body = await request.json() as { key?: string };
        key = body.key || null;
      } catch {
        // body 不是 JSON，忽略
      }
    }

    if (!key) {
      return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
    }

    const storage = getS3Storage();
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 3600, // 1 小时
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成链接失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}