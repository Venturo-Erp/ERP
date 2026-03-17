#!/usr/bin/env node

/**
 * 景點資料品質檢查腳本
 * 隨機抽查 10-15 個台灣景點，評估資料品質
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 讀取環境變數
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 評分標準
const SCORE_CRITERIA = {
  description: {
    name: '描述品質',
    checks: {
      hasImagery: { name: '具體畫面感', weight: 2 },
      hasContext: { name: '故事/文化脈絡', weight: 2 },
      noFormula: { name: '避免公式化語句', weight: 1 },
      lengthOK: { name: '長度 80-150 字', weight: 1 }
    }
  },
  pricing: {
    name: '門票價格',
    checks: {
      specific: { name: '具體明確', weight: 2 },
      currency: { name: '幣別正確', weight: 1 }
    }
  },
  hours: {
    name: '營業時間',
    checks: {
      jsonValid: { name: 'JSON 格式正確', weight: 2 },
      seasonal: { name: '考慮季節/假日', weight: 1 }
    }
  },
  verifiable: {
    name: '可驗證性',
    checks: {
      reasonable: { name: '資訊合理', weight: 1 },
      noErrors: { name: '無明顯錯誤', weight: 1 }
    }
  }
};

// 評估描述品質
function evaluateDescription(description) {
  if (!description) return { score: 0, issues: ['缺少描述'] };
  
  const issues = [];
  let score = 0;
  const maxScore = 6;
  
  // 具體畫面感（檢查感官詞彙）
  const imageryWords = ['色彩', '風景', '建築', '香氣', '聲音', '景色', '山林', '海岸', '溪流', '古', '傳統', '壯觀', '幽靜', '繁華'];
  const hasImagery = imageryWords.some(word => description.includes(word));
  if (hasImagery) score += 2; else issues.push('缺乏具體畫面感');
  
  // 故事/文化脈絡
  const contextWords = ['歷史', '文化', '傳說', '故事', '時期', '年代', '發展', '傳承', '特色', '由來'];
  const hasContext = contextWords.some(word => description.includes(word));
  if (hasContext) score += 2; else issues.push('缺少文化/歷史脈絡');
  
  // 避免公式化
  const formulaicPhrases = ['熱門景點', '展現.*文化', '著名.*地標', '必訪之地', '不容錯過'];
  const hasFormula = formulaicPhrases.some(phrase => new RegExp(phrase).test(description));
  if (!hasFormula) score += 1; else issues.push('使用公式化語句');
  
  // 長度檢查
  const length = description.length;
  if (length >= 80 && length <= 150) {
    score += 1;
  } else {
    issues.push(`長度 ${length} 字（理想 80-150 字）`);
  }
  
  return { score, maxScore, issues };
}

// 評估門票價格
function evaluatePricing(pricing) {
  if (!pricing) return { score: 0, issues: ['缺少門票資訊'] };
  
  const issues = [];
  let score = 0;
  const maxScore = 3;
  
  // 具體明確
  if (pricing.includes('依業者而異') || pricing.includes('請洽') || pricing.includes('未定')) {
    issues.push('價格不明確');
  } else if (/\d+/.test(pricing)) {
    score += 2;
  } else {
    issues.push('缺少具體金額');
  }
  
  // 幣別檢查
  if (pricing.includes('NT$') || pricing.includes('TWD') || pricing.includes('元')) {
    score += 1;
  } else if (pricing.toLowerCase().includes('免費') || pricing.toLowerCase().includes('free')) {
    score += 1;
  } else {
    issues.push('缺少幣別標示');
  }
  
  return { score, maxScore, issues };
}

// 評估營業時間
function evaluateHours(hours) {
  if (!hours) return { score: 0, issues: ['缺少營業時間'] };
  
  const issues = [];
  let score = 0;
  const maxScore = 3;
  
  // JSON 格式檢查
  try {
    if (typeof hours === 'object') {
      score += 2;
    } else if (typeof hours === 'string') {
      JSON.parse(hours);
      score += 2;
    }
  } catch (e) {
    issues.push('JSON 格式錯誤');
  }
  
  // 季節/假日差異
  const hoursStr = typeof hours === 'string' ? hours : JSON.stringify(hours);
  if (hoursStr.includes('假日') || hoursStr.includes('週末') || hoursStr.includes('seasonal')) {
    score += 1;
  } else {
    issues.push('未考慮季節/假日差異');
  }
  
  return { score, maxScore, issues };
}

// 綜合評分（1-5 分）
function calculateOverallScore(evaluations) {
  const totalScore = Object.values(evaluations).reduce((sum, e) => sum + e.score, 0);
  const totalMax = Object.values(evaluations).reduce((sum, e) => sum + e.maxScore, 0);
  
  const percentage = (totalScore / totalMax) * 100;
  
  if (percentage >= 90) return 5;
  if (percentage >= 75) return 4;
  if (percentage >= 60) return 3;
  if (percentage >= 40) return 2;
  return 1;
}

async function main() {
  console.log('🔍 開始檢查台灣景點資料品質...\n');
  
  // 查詢台灣景點（隨機抽樣 15 個）
  // 先查詢台灣的 country_id
  const { data: countries } = await supabase
    .from('countries')
    .select('id')
    .eq('code', 'TW')
    .single();
  
  if (!countries) {
    console.error('❌ 找不到台灣國家資料');
    process.exit(1);
  }
  
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', countries.id)
    .limit(1000); // 先取較多再隨機
  
  if (error) {
    console.error('❌ 查詢失敗:', error.message);
    process.exit(1);
  }
  
  if (!attractions || attractions.length === 0) {
    console.error('❌ 找不到台灣景點資料');
    process.exit(1);
  }
  
  // 隨機抽樣 15 個
  const shuffled = attractions.sort(() => 0.5 - Math.random());
  const sample = shuffled.slice(0, Math.min(15, attractions.length));
  
  console.log(`📊 從 ${attractions.length} 個景點中隨機抽查 ${sample.length} 個\n`);
  console.log('='.repeat(80) + '\n');
  
  const results = [];
  
  for (const attraction of sample) {
    const evaluations = {
      description: evaluateDescription(attraction.description),
      pricing: evaluatePricing(attraction.ticket_price),
      hours: evaluateHours(attraction.opening_hours)
    };
    
    const overallScore = calculateOverallScore(evaluations);
    
    results.push({
      id: attraction.id,
      name: attraction.name || attraction.english_name,
      evaluations,
      overallScore,
      data: attraction
    });
    
    // 顯示個別景點評估
    console.log(`🏛️  ${attraction.name || attraction.english_name}`);
    console.log(`   ID: ${attraction.id}`);
    console.log(`   類別: ${attraction.category || 'N/A'}`);
    console.log(`   綜合評分: ${'★'.repeat(overallScore)}${'☆'.repeat(5 - overallScore)} (${overallScore}/5)\n`);
    
    Object.entries(evaluations).forEach(([key, result]) => {
      const percentage = ((result.score / result.maxScore) * 100).toFixed(0);
      console.log(`   ${SCORE_CRITERIA[key].name}: ${result.score}/${result.maxScore} (${percentage}%)`);
      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`      ⚠️  ${issue}`));
      }
    });
    
    console.log('\n' + '-'.repeat(80) + '\n');
  }
  
  // 統計摘要
  console.log('='.repeat(80));
  console.log('\n📈 品質報告摘要\n');
  
  const avgScore = (results.reduce((sum, r) => sum + r.overallScore, 0) / results.length).toFixed(2);
  const scoreDistribution = [1, 2, 3, 4, 5].map(score => ({
    score,
    count: results.filter(r => r.overallScore === score).length
  }));
  
  console.log(`平均評分: ${avgScore} / 5.0\n`);
  console.log('評分分布:');
  scoreDistribution.forEach(({ score, count }) => {
    const bar = '█'.repeat(count);
    console.log(`  ${score} 分: ${bar} (${count})`);
  });
  
  // 需要改進的景點
  const needsImprovement = results.filter(r => r.overallScore < 4).sort((a, b) => a.overallScore - b.overallScore);
  
  if (needsImprovement.length > 0) {
    console.log('\n\n🔧 需要改進的景點 (評分 < 4):\n');
    
    needsImprovement.forEach(({ name, overallScore, evaluations }) => {
      console.log(`${name} (${overallScore}/5):`);
      
      Object.entries(evaluations).forEach(([key, result]) => {
        if (result.issues.length > 0) {
          console.log(`  ${SCORE_CRITERIA[key].name}:`);
          result.issues.forEach(issue => console.log(`    • ${issue}`));
        }
      });
      
      console.log('');
    });
  }
  
  // 具體改進建議
  console.log('\n💡 改進建議:\n');
  
  const commonIssues = {};
  results.forEach(result => {
    Object.values(result.evaluations).forEach(evaluation => {
      evaluation.issues.forEach(issue => {
        commonIssues[issue] = (commonIssues[issue] || 0) + 1;
      });
    });
  });
  
  const sortedIssues = Object.entries(commonIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  sortedIssues.forEach(([issue, count], index) => {
    console.log(`${index + 1}. ${issue} (${count} 個景點)`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 檢查完成！\n');
}

main().catch(console.error);
