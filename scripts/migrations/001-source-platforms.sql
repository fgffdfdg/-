-- Migration: 001-source-platforms
-- Description: 创建 source_platforms 表，用于存储用户自定义车源平台
-- Execute: 在 Supabase SQL Editor 中执行本文件

CREATE TABLE IF NOT EXISTS source_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  organization_id UUID,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS source_platforms_user_id_idx ON source_platforms(user_id);
CREATE INDEX IF NOT EXISTS source_platforms_org_id_idx ON source_platforms(organization_id);
-- 同一组织下域名唯一，防止重复创建
CREATE UNIQUE INDEX IF NOT EXISTS source_platforms_org_domain_uidx ON source_platforms(COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'), domain);

-- 行级安全策略
ALTER TABLE source_platforms ENABLE ROW LEVEL SECURITY;

-- 用户读取自己的平台
CREATE POLICY source_platforms_select_own ON source_platforms
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户插入自己的平台
CREATE POLICY source_platforms_insert_own ON source_platforms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户删除自己的平台
CREATE POLICY source_platforms_delete_own ON source_platforms
  FOR DELETE
  USING (auth.uid() = user_id);