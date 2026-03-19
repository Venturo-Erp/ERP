#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * 執行 migration 檔案到 Supabase
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 從 .env.local 讀取
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

// 執行 SQL
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 直接用 psql wire protocol（更簡單的方式）
async function runMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  console.log(`\n📄 執行: ${fileName}`);
  
  try {
    // 使用 pg 套件執行 SQL
    const { Client } = require('pg');
    
    // 從 Supabase URL 提取 connection string
    const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];
    const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY.split('.')[2]}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    
    const client = new Client({ connectionString });
    await client.connect();
    await client.query(sql);
    await client.end();
    
    console.log(`✅ ${fileName} 執行成功`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName} 執行失敗:`, error.message);
    return false;
  }
}

// 主函數
async function main() {
  const migrations = process.argv.slice(2);
  
  if (migrations.length === 0) {
    console.log('Usage: node run-migration.js <migration-file-1> [migration-file-2] ...');
    process.exit(1);
  }

  console.log('🚀 開始執行 Supabase Migrations...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migrationPath of migrations) {
    const fullPath = path.resolve(migrationPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ 檔案不存在: ${fullPath}`);
      failCount++;
      continue;
    }
    
    const success = await runMigration(fullPath);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 執行完成: ${successCount} 成功, ${failCount} 失敗`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 執行失敗:', error);
  process.exit(1);
});
