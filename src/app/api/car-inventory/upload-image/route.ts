import { NextRequest, NextResponse } from 'next/server';
import { getS3Storage, sanitizeSegment } from '@/lib/s3';

/**
 * POST /api/car-inventory/upload-image
 * 上传行驶证/绿本图片到 S3，返回文件 key 和签名 URL。
 *
 * Body: { imageBase64: string; fileName?: string; contentType?: string }
 * Response: { key: string; url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, fileName, contentType } = body as {
      imageBase64?: string;
      fileName?: string;
      contentType?: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    // 解码 base64
    const buffer = Buffer.from(imageBase64, 'base64');

    // 生成文件名
    const ext = contentType?.startsWith('image/') ? contentType.split('/')[1]?.replace('jpeg', 'jpg') : 'jpg';
    const safeName = sanitizeSegment(fileName || `vehicle_doc_${Date.now()}.${ext}`, `vehicle_doc_${Date.now()}.${ext}`);
    const fullName = safeName.includes('.') ? safeName : `${safeName}.${ext}`;

    const storage = getS3Storage();
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: `car-inventory/${fullName}`,
      contentType: contentType || 'image/jpeg',
    });

    // 生成长期签名 URL（30 天）
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 2592000,
    });

    return NextResponse.json({ key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}