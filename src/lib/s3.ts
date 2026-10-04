/**
 * 服务端 S3 兼容对象存储单例封装。
 *
 * - 仅用于服务端（API Route / Server Action），不要 import 到客户端组件。
 * - 桶、endpoint、密钥均从环境变量读取，由 Coze 平台注入。
 * - 上传后返回的 key 带 UUID 前缀，持久化到数据库时必须使用该返回值。
 */
import { S3Storage } from 'coze-coding-dev-sdk';

let _storage: S3Storage | null = null;

export function getS3Storage(): S3Storage {
  if (_storage) return _storage;
  _storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: '',
    secretKey: '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: 'cn-beijing',
  });
  return _storage;
}

/** 把任意字符串清洗成 S3 key 可用的单段文件名（保留中文、字母、数字、点、下划线、短横） */
export function sanitizeSegment(input: string, fallback = 'file'): string {
  const cleaned = input
    .replace(/[\\/]+/g, '_')
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '');
  return cleaned || fallback;
}
