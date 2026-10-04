-- Migration: 002-document-search
-- Description: 单证统一检索功能数据库变更
--   1. contract_documents 增加 official 状态
--   2. 新建 customs_declaration_files 表（报关单正式文件上传）
--   3. 新建 bl_documents 表（海运提单管理）
-- Execute: 在 Supabase SQL Editor 中执行本文件

-- ============================================================
-- 1. contract_documents 状态约束更新
-- ============================================================
ALTER TABLE contract_documents DROP CONSTRAINT IF EXISTS contract_documents_status_check;
ALTER TABLE contract_documents ADD CONSTRAINT contract_documents_status_check
  CHECK (status = ANY (ARRAY['draft', 'official', 'archived']));

-- ============================================================
-- 2. 报关单正式文件表
-- ============================================================
CREATE TABLE IF NOT EXISTS customs_declaration_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  organization_id UUID,
  entry_no TEXT NOT NULL,                    -- 报关单号
  customs_no TEXT,                           -- 海关编号
  contract_no TEXT,                          -- 关联合同号
  vins TEXT[] NOT NULL DEFAULT '{}',         -- 车架号列表
  file_key TEXT NOT NULL,                    -- S3 文件 key
  file_name TEXT NOT NULL,                   -- 原始文件名
  file_mime TEXT NOT NULL,                   -- 文件 MIME 类型
  file_size INTEGER NOT NULL DEFAULT 0,      -- 文件大小（字节）
  issue_date DATE,                           -- 签发日期
  note TEXT,                                 -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS cdf_entry_no_idx ON customs_declaration_files(entry_no);
CREATE INDEX IF NOT EXISTS cdf_customs_no_idx ON customs_declaration_files(customs_no);
CREATE INDEX IF NOT EXISTS cdf_contract_no_idx ON customs_declaration_files(contract_no);
CREATE INDEX IF NOT EXISTS cdf_user_id_idx ON customs_declaration_files(user_id);
CREATE INDEX IF NOT EXISTS cdf_org_id_idx ON customs_declaration_files(organization_id);
CREATE INDEX IF NOT EXISTS cdf_created_at_idx ON customs_declaration_files(created_at DESC);
CREATE INDEX IF NOT EXISTS cdf_vins_gin_idx ON customs_declaration_files USING GIN (vins);

-- 行级安全策略
ALTER TABLE customs_declaration_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdf_select_own ON customs_declaration_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY cdf_insert_own ON customs_declaration_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY cdf_update_own ON customs_declaration_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY cdf_delete_own ON customs_declaration_files
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. 海运提单表
-- ============================================================
CREATE TABLE IF NOT EXISTS bl_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  organization_id UUID,
  bl_no TEXT NOT NULL,                       -- 提单号
  vessel_name TEXT,                          -- 船名
  voyage TEXT,                               -- 船次
  container_numbers TEXT[] NOT NULL DEFAULT '{}', -- 集装箱号列表
  vins TEXT[] NOT NULL DEFAULT '{}',         -- 车架号列表
  port_of_loading TEXT,                      -- 起运港
  port_of_discharge TEXT,                    -- 卸货港
  shipping_date DATE,                        -- 装船日期
  estimated_arrival_date DATE,               -- 预计到港日期
  carrier TEXT,                              -- 承运人/船公司
  file_key TEXT NOT NULL,                    -- S3 文件 key
  file_name TEXT NOT NULL,                   -- 原始文件名
  file_mime TEXT NOT NULL,                   -- 文件 MIME 类型
  file_size INTEGER NOT NULL DEFAULT 0,      -- 文件大小（字节）
  note TEXT,                                 -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS bld_bl_no_idx ON bl_documents(bl_no);
CREATE INDEX IF NOT EXISTS bld_vessel_name_idx ON bl_documents(vessel_name);
CREATE INDEX IF NOT EXISTS bld_user_id_idx ON bl_documents(user_id);
CREATE INDEX IF NOT EXISTS bld_org_id_idx ON bl_documents(organization_id);
CREATE INDEX IF NOT EXISTS bld_created_at_idx ON bl_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS bld_vins_gin_idx ON bl_documents USING GIN (vins);
CREATE INDEX IF NOT EXISTS bld_containers_gin_idx ON bl_documents USING GIN (container_numbers);

-- 行级安全策略
ALTER TABLE bl_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY bld_select_own ON bl_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bld_insert_own ON bl_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bld_update_own ON bl_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY bld_delete_own ON bl_documents
  FOR DELETE USING (auth.uid() = user_id);