#!/usr/bin/env node

/**
 * 執行會計模組 Migrations
 * 使用 Supabase client 執行 SQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 載入環境變數
dotenv.config({ path: join(projectRoot, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

// 建立 Supabase client（使用 service role key）
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 執行 SQL（分段執行，避免超時）
async function executeSQL(sql, fileName) {
  console.log(`\n📄 執行: ${fileName}`);
  
  try {
    // 分割 SQL 語句（用分號分隔，但要小心 function 內的分號）
    const statements = sql
      .split(/;\s*$/gm)  // 用行尾的分號分割
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));  // 移除空白和註解
    
    console.log(`   → ${statements.length} 個語句`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // 跳過註解
      if (stmt.startsWith('--') || stmt.startsWith('/*')) {
        continue;
      }
      
      // 執行語句
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      
      if (error) {
        // 如果是 function 不存在，嘗試直接用 SQL
        if (error.message.includes('exec_sql')) {
          console.log('   ⚠️  exec_sql 不存在，使用替代方式...');
          // 直接執行（這個方式有限制，但可以試試）
          const { error: directError } = await supabase.from('_sql').insert({ query: stmt });
          if (directError) {
            throw new Error(`語句 ${i + 1} 失敗: ${directError.message}\n${stmt.substring(0, 100)}...`);
          }
        } else {
          throw new Error(`語句 ${i + 1} 失敗: ${error.message}\n${stmt.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`✅ ${fileName} 執行成功`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName} 執行失敗:`, error.message);
    return false;
  }
}

// 主函數
async function main() {
  console.log('🚀 開始執行會計模組 Migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);
  
  const migrations = [
    'supabase/migrations/20251216130000_create_accounting_module.sql',
    'supabase/migrations/20260111000011_create_accounting_period_closings.sql',
    'supabase/migrations/20260319000000_create_checks_management.sql',
    'supabase/migrations/20260319100000_add_accounting_voucher_links.sql',
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migrationPath of migrations) {
    const fullPath = join(projectRoot, migrationPath);
    
    try {
      const sql = readFileSync(fullPath, 'utf8');
      const fileName = migrationPath.split('/').pop();
      
      const success = await executeSQL(sql, fileName);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`❌ 無法讀取: ${migrationPath}`, error.message);
      failCount++;
    }
  }
  
  console.log(`\n📊 執行完成: ${successCount} 成功, ${failCount} 失敗`);
  
  if (failCount > 0) {
    console.log('\n⚠️  有些 migration 執行失敗。');
    console.log('建議：請到 Supabase Dashboard 手動執行失敗的 SQL。');
    console.log('URL: https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new');
  }
  
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 執行失敗:', error);
  process.exit(1);
});
