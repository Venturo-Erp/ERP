#!/usr/bin/env node

/**
 * 景點描述批次清理腳本
 * 移除實用資訊，只保留景點本質
 */

const { execSync } = require('child_process');

// 清理規則
function cleanDescription(text) {
  if (!text) return text;
  
  let cleaned = text;
  
  // 1. 刪除「這是XX必訪景點，也是...」整句
  cleaned = cleaned.replace(/這是[^。，]+必訪景點[^。]+。/g, '');
  
  // 2. 刪除「可搭配XX一起遊覽」整句
  cleaned = cleaned.replace(/可搭配[^。]+一起遊覽。/g, '');
  
  // 3. 刪除「建議預留X小時/天」整句
  cleaned = cleaned.replace(/建議預留[^。]+。/g, '');
  cleaned = cleaned.replace(/建議停留[^。]+。/g, '');
  cleaned = cleaned.replace(/建議住宿[^。]+。/g, '');
  
  // 4. 刪除價格資訊（門票XX元、約XX日圓、XX泰銖等）
  cleaned = cleaned.replace(/門票[^。，]+[元日圓泰銖披索][^。，]*[。，]/g, '');
  cleaned = cleaned.replace(/約?\d+[-~]\d+[元日圓泰銖披索][^。，]*[。，]/g, '');
  cleaned = cleaned.replace(/\d+[元日圓泰銖披索][^。，]*[。，]/g, '');
  
  // 5. 刪除「免費參觀」、「需購票」等
  cleaned = cleaned.replace(/免費參觀[^。]*。/g, '');
  cleaned = cleaned.replace(/需購票[^。]*。/g, '');
  cleaned = cleaned.replace(/[（(][^)）]*維護費[^)）]*[)）]/g, '');
  
  // 6. 刪除開放時間
  cleaned = cleaned.replace(/\d+[月].*?開放[^。]*。/g, '');
  cleaned = cleaned.replace(/[週周][一二三四五六日].*?休館[^。]*。/g, '');
  
  // 7. 刪除季節建議
  cleaned = cleaned.replace(/建議[^。]*季節前往[^。]*。/g, '');
  
  // 8. 刪除注意事項
  cleaned = cleaned.replace(/需穿著[^。]+。/g, '');
  cleaned = cleaned.replace(/需提前預訂[^。]+。/g, '');
  cleaned = cleaned.replace(/禁止[^。]+。/g, '');
  cleaned = cleaned.replace(/私家車禁止[^。]+。/g, '');
  cleaned = cleaned.replace(/需搭[^。]+進入[^。]*。/g, '');
  cleaned = cleaned.replace(/需持[^。]+證照[^。]*。/g, '');
  
  // 9. 清理多餘空白和標點
  cleaned = cleaned.replace(/\s+/g, '');
  cleaned = cleaned.replace(/。。+/g, '。');
  cleaned = cleaned.replace(/，。/g, '。');
  
  return cleaned.trim();
}

// 執行 SQL 查詢
function query(sql) {
  try {
    const result = execSync(
      `npx supabase db query --linked "${sql.replace(/"/g, '\\"')}"`,
      { cwd: '/Users/tokichin/Projects/venturo-erp', encoding: 'utf-8' }
    );
    return result;
  } catch (error) {
    console.error('查詢失敗:', error.message);
    throw error;
  }
}

// 解析查詢結果（簡化版）
function parseQueryResult(output) {
  const lines = output.split('\n').filter(l => l.trim());
  const dataLines = lines.filter(l => l.startsWith('│') && !l.includes('─'));
  
  if (dataLines.length < 3) return [];
  
  const results = [];
  for (let i = 2; i < dataLines.length - 1; i++) {
    const parts = dataLines[i].split('│').map(p => p.trim()).filter(p => p);
    if (parts.length >= 3) {
      results.push({
        id: parts[0],
        name: parts[1],
        description: parts[2]
      });
    }
  }
  
  return results;
}

// 主要處理邏輯
async function main() {
  console.log('🚀 開始景點描述批次清理...\n');
  
  const batchSize = 50;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  const examples = [];
  
  while (true) {
    console.log(`\n📊 處理批次 ${Math.floor(offset / batchSize) + 1}（offset: ${offset}）...`);
    
    // 查詢一批資料
    const sql = `SELECT id, name, description FROM attractions 
      WHERE description LIKE '%這是%' 
         OR description LIKE '%可搭配%' 
         OR description LIKE '%建議預留%' 
         OR description LIKE '%免費參觀%' 
         OR description LIKE '%需購票%' 
         OR description LIKE '%元%' 
         OR description LIKE '%日圓%' 
         OR description LIKE '%泰銖%' 
      LIMIT ${batchSize} OFFSET ${offset}`;
    
    const result = query(sql);
    const attractions = parseQueryResult(result);
    
    if (attractions.length === 0) {
      console.log('\n✅ 所有批次處理完成！');
      break;
    }
    
    console.log(`   找到 ${attractions.length} 筆資料`);
    
    // 處理每一筆
    for (const attr of attractions) {
      const original = attr.description;
      const cleaned = cleanDescription(original);
      
      if (cleaned !== original) {
        // 產生 UPDATE SQL
        const escapedCleaned = cleaned.replace(/'/g, "''");
        const updateSql = `UPDATE attractions SET description = '${escapedCleaned}' WHERE id = '${attr.id}'`;
        
        try {
          query(updateSql);
          totalUpdated++;
          
          // 收集前 3 個範例
          if (examples.length < 3) {
            examples.push({
              name: attr.name,
              before: original,
              after: cleaned
            });
          }
          
          console.log(`   ✓ ${attr.name}`);
        } catch (error) {
          console.error(`   ✗ ${attr.name} 更新失敗:`, error.message);
        }
      }
      
      totalProcessed++;
    }
    
    offset += batchSize;
    
    // 避免過快執行
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 輸出報告
  console.log('\n' + '='.repeat(60));
  console.log('📋 清理報告');
  console.log('='.repeat(60));
  console.log(`✅ 處理總數: ${totalProcessed} 筆`);
  console.log(`✅ 更新總數: ${totalUpdated} 筆`);
  console.log(`\n📝 範例對比（前 3 筆）:\n`);
  
  examples.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name}`);
    console.log(`   修正前: ${ex.before.substring(0, 200)}${ex.before.length > 200 ? '...' : ''}`);
    console.log(`   修正後: ${ex.after.substring(0, 200)}${ex.after.length > 200 ? '...' : ''}`);
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('🎉 清理完成！');
}

main().catch(console.error);
