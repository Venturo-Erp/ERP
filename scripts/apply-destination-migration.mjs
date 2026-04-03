#!/usr/bin/env node
/**
 * 直接執行 SQL 建立景點選擇系統表格
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const sql = `
-- 清邁景點選擇系統 - 資料表

-- ============================================
-- 1. destinations 表（景點資料庫）
-- ============================================
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT '清邁',
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  tags TEXT[],
  image_url TEXT,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_destinations_city ON public.destinations(city);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON public.destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_priority ON public.destinations(priority);

-- ============================================
-- 2. customer_destination_picks 表（客戶選擇記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_destination_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  session_id TEXT,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_picks_line_user ON public.customer_destination_picks(line_user_id);
CREATE INDEX IF NOT EXISTS idx_picks_session ON public.customer_destination_picks(session_id);
CREATE INDEX IF NOT EXISTS idx_picks_destination ON public.customer_destination_picks(destination_id);

-- ============================================
-- 3. RLS 政策
-- ============================================
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_destination_picks ENABLE ROW LEVEL SECURITY;

-- destinations 全部可讀
DROP POLICY IF EXISTS destinations_public_read ON public.destinations;
CREATE POLICY destinations_public_read ON public.destinations
  FOR SELECT USING (true);

-- picks 全部可讀寫（內部工具）
DROP POLICY IF EXISTS picks_user_read ON public.customer_destination_picks;
CREATE POLICY picks_user_read ON public.customer_destination_picks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS picks_insert ON public.customer_destination_picks;
CREATE POLICY picks_insert ON public.customer_destination_picks
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 觸發器：自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_destinations_updated_at ON public.destinations;
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
`

async function main() {
  console.log('🚀 開始建立景點選擇系統資料表...\n')

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // 如果 exec_sql 不存在，直接用 supabase-js 建表（但這不支援 DDL）
      console.log('⚠️  無法使用 RPC，嘗試直接建立...')
      throw error
    }

    console.log('✅ 資料表建立成功！')
    console.log('\n📋 已建立：')
    console.log('  - destinations（景點資料庫）')
    console.log('  - customer_destination_picks（客戶選擇記錄）')
    
  } catch (error) {
    console.error('❌ 建立失敗:', error.message)
    console.log('\n💡 請手動在 Supabase SQL Editor 執行以下 SQL：')
    console.log('---')
    console.log(sql)
    console.log('---')
    process.exit(1)
  }
}

main().catch(console.error)
