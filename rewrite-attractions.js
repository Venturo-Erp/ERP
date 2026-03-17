#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

// 印尼景點資料庫
const indonesiaDescriptions = {
  // 峇里島
  'Capella Ubud': {
    description: '《Capella Ubud》隱身烏布雨林深處，帳篷別墅融入山谷綠意，私人泳池、露天浴缸與叢林共生。晨起霧氣繚繞，夜晚星空璀璨，頂級服務結合原始野性，打造隱世奢華體驗。適合追求極致隱私與自然沉浸的旅人。',
    ticket_price: '房價約Rp 15,000,000起/晚',
    opening_hours: { daily: '24小時入住服務' }
  },
  'Waterbom水上樂園': {
    description: '《Waterbom水上樂園》位於庫塔海灘區，多次榮獲亞洲最佳水上樂園獎項。刺激滑水道、漂漂河、兒童戲水區一應俱全，熱帶花園環繞，設施維護極佳。適合親子同遊，炎熱天氣的消暑首選，玩水之餘還能享受峇里島悠閒氛圍。',
    ticket_price: '成人Rp 450,000-650,000',
    opening_hours: { daily: '09:00-18:00' }
  },
  '京打馬尼火山': {
    description: '《京打馬尼火山》海拔1,717公尺，活火山巴杜爾山與湖泊構成壯闊火山口景觀。清晨攀登觀日出，霧氣散去後黑色火山岩與碧藍湖水對比震撼。山腳溫泉村莊、咖啡園點綴，是峇里島高地必訪自然奇景，攝影師與登山愛好者的天堂。',
    ticket_price: '入山費Rp 50,000-100,000',
    opening_hours: { daily: '凌晨04:00起（日出團）' }
  },
  // 雅加達
  '伊斯蒂克拉爾清真寺': {
    description: '《伊斯蒂克拉爾清真寺》是東南亞最大清真寺，白色大理石建築配以不鏽鋼圓頂，可容納超過12萬信徒。建於1961-1978年間，象徵印尼獨立與宗教包容。挑高大廳、幾何圖紋、巨型吊燈展現伊斯蘭現代建築美學，非穆斯林可預約導覽參觀。',
    ticket_price: '免費參觀（建議捐獻）',
    opening_hours: { 
      weekday: '04:30-21:30',
      friday: '11:30後開放非穆斯林',
      notes: '祈禱時間限穆斯林'
    }
  },
  '佩妮達島': {
    description: '《佩妮達島》位於峇里島東南方，保留原始粗獷之美。Kelingking Beach「暴龍灣」斷崖如恐龍側影，Angel Billabong天然無邊際泳池，Broken Beach拱門海蝕洞震撼人心。陡峭山路、未開發海岸充滿冒險感，適合熱愛秘境探險的旅人。',
    ticket_price: '渡輪往返Rp 150,000-250,000',
    opening_hours: { daily: '全天開放（建議08:00-16:00）' }
  },
  // 日惹
  '婆羅浮屠': {
    description: '《婆羅浮屠》建於8-9世紀，世界最大佛教寺廟建築群，UNESCO世界遺產。九層方形與圓形平台象徵佛教宇宙觀，504尊佛像、2,672塊浮雕述說佛陀一生。日出時分，薄霧中的鐘形佛塔與遠山剪影，展現千年信仰與建築奇蹟的永恆之美。',
    ticket_price: '外國遊客US$25-30（含日出票更高）',
    opening_hours: { 
      sunrise: '04:30-06:30',
      regular: '06:30-17:00'
    }
  },
  '普蘭巴南': {
    description: '《普蘭巴南》建於9世紀，印度教寺廟群，與婆羅浮屠齊名的爪哇文化瑰寶。主塔高47公尺供奉濕婆神，精緻石雕描繪羅摩衍那史詩。夕陽時分，尖塔剪影與金色天空交織，偶有傳統舞蹈表演於寺前上演，古文明與藝術在此交融。',
    ticket_price: '外國遊客US$25（含舞蹈表演更高）',
    opening_hours: { 
      daily: '06:00-17:00',
      dance: '19:30-21:30（週二四六）'
    }
  }
};

// 菲律賓景點資料庫
const philippinesDescriptions = {
  // 長灘島
  'Crimson Boracay': {
    description: '《Crimson Boracay》坐落於Station Zero寧靜海岸，遠離White Beach熱鬧人潮卻保有便利性。無邊際泳池面向大海，私人沙灘、水上活動、SPA設施完善。現代設計融入熱帶風情，適合情侶度假或家庭出遊，享受長灘島精緻度假體驗。',
    ticket_price: '房價約₱8,000起/晚',
    opening_hours: { daily: '24小時入住服務' }
  },
  'D Mall': {
    description: '《D Mall》是長灘島最熱鬧的購物餐飲集散地，位於Station 2黃金地段。上百家商店、餐廳、按摩店、紀念品舖集中於此，從平價小吃到海景餐廳選擇豐富。夜晚燈火通明、音樂環繞，是島上社交中心與覓食首選，逛街購物一站滿足。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-23:00（店家營業時間不一）' }
  },
  // 巴拉望
  'El Nido': {
    description: '《愛妮島El Nido》位於巴拉望北端，石灰岩峭壁、隱密潟湖、珊瑚海灘構成菲律賓最美海島風光。跳島遊（Island Hopping）探訪Big Lagoon、Secret Beach、七號礁岩，浮潛邂逅海龜、熱帶魚群。日落時分，金光灑落海面，漁船剪影詩意動人。',
    ticket_price: '環境稅₱200，跳島Tour約₱1,200-1,800',
    opening_hours: { daily: '08:00-17:00（跳島團出發時間）' }
  },
  'Coron': {
    description: '《科隆島Coron》以二戰沉船潛水與絕美湖泊聞名。Kayangan Lake鏡面倒影、Twin Lagoon雙子潟湖、Siete Pecados七子礁浮潛勝地，海水透明度驚人。攀上觀景台俯瞰石灰岩島嶼群，層次分明的藍綠色海面，是潛水愛好者與冒險家的夢幻目的地。',
    ticket_price: '環境稅₱200，跳島Tour約₱1,500-2,000',
    opening_hours: { daily: '07:00-17:00（跳島團出發時間）' }
  },
  // 馬尼拉
  'Ayala Center Cebu': {
    description: '《Ayala Center Cebu》是宿霧市最具規模的購物中心，彙集國際精品、本地品牌、美食廣場、電影院、超市於一體。綠化中庭、現代建築設計舒適宜人，週末常有市集活動與表演。是宿霧市民日常消費、遊客採購伴手禮與用餐的首選商圈。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-21:00' }
  },
  'AYALA購物廣場宿務': {
    description: '《Ayala購物廣場宿務》（同Ayala Center Cebu）是宿霧最大購物商場，擁有超過300家店鋪與餐廳。從平價連鎖到高端品牌應有盡有，美食區涵蓋菲律賓菜、日韓料理、西式快餐。空調舒適、設施新穎，逛街購物、用餐、看電影一站滿足，是旅遊補給與休閒的理想去處。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-21:00' }
  }
};

async function rewriteAttraction(attraction, country) {
  const isIndonesia = country === 'indonesia';
  const descriptions = isIndonesia ? indonesiaDescriptions : philippinesDescriptions;
  
  // 檢查是否有預先定義的描述
  const customDesc = descriptions[attraction.name];
  
  if (customDesc) {
    return {
      ...attraction,
      description: customDesc.description,
      ticket_price: customDesc.ticket_price,
      opening_hours: customDesc.opening_hours
    };
  }
  
  // 如果沒有預先定義，產生通用描述
  return generateGenericDescription(attraction, country);
}

function generateGenericDescription(attraction, country) {
  const isIndonesia = country === 'indonesia';
  const countryName = isIndonesia ? '印尼' : '菲律賓';
  const currency = isIndonesia ? 'Rp' : '₱';
  const priceRange = isIndonesia ? '50,000-200,000' : '200-800';
  
  // 根據分類產生描述
  let description = `《${attraction.name}》`;
  
  if (attraction.category?.includes('自然') || attraction.category?.includes('Nature')) {
    description += `位於${countryName}，擁有壯麗自然景觀。熱帶風情、原始生態與獨特地貌相結合，適合喜愛大自然的旅人探索。無論是徒步健行、觀景攝影或生態觀察，都能感受${countryName}自然之美的震撼與寧靜。`;
  } else if (attraction.category?.includes('歷史') || attraction.category?.includes('Historical')) {
    description += `是${countryName}重要歷史文化遺址，展現當地傳統建築藝術與文明智慧。精緻雕刻、古老傳說與信仰儀式交織，見證時代變遷。適合對歷史文化有興趣的旅客深度體驗，感受${countryName}豐富的文化底蘊。`;
  } else if (attraction.category?.includes('購物') || attraction.category?.includes('Shopping')) {
    description += `是${countryName}熱門購物商圈，彙集本地特色商品、手工藝品與國際品牌。從傳統市集到現代商場，選擇多元，適合採購伴手禮與體驗在地商業文化。空調舒適、餐飲選擇豐富，是旅遊休閒與補給的理想去處。`;
  } else if (attraction.category?.includes('餐廳') || attraction.category?.includes('Restaurant')) {
    description += `提供道地${countryName}美食與國際料理，環境舒適、服務周到。無論是海鮮、燒烤、傳統家常菜或現代創意料理，都能滿足味蕾。適合家庭聚餐、朋友聚會或商務宴請，品嚐${countryName}多元飲食文化。`;
  } else if (attraction.category?.includes('住宿') || attraction.category?.includes('Accommodation')) {
    description += `提供舒適住宿環境與完善設施，地理位置便利。客房寬敞、服務專業，部分設有泳池、SPA、健身房等休閒設施。適合度假放鬆或商務出差，體驗${countryName}熱情好客的待客之道。`;
  } else {
    description += `是${countryName}值得一遊的景點，融合當地特色與獨特魅力。無論是建築設計、自然環境或文化氛圍，都展現${countryName}多元面貌。適合各類旅客探訪，感受當地生活節奏與旅遊樂趣。`;
  }
  
  return {
    ...attraction,
    description: description,
    ticket_price: `約${currency} ${priceRange}`,
    opening_hours: attraction.opening_hours || { daily: '09:00-18:00' }
  };
}

async function updateDatabase(attractions, country) {
  let successCount = 0;
  let failCount = 0;
  const results = [];

  console.log(`\n開始更新 ${country === 'indonesia' ? '🇮🇩 印尼' : '🇵🇭 菲律賓'} ${attractions.length} 個景點...\n`);

  for (const attr of attractions) {
    try {
      const rewritten = await rewriteAttraction(attr, country);
      
      const { data, error } = await supabase
        .from('attractions')
        .update({
          description: rewritten.description,
          ticket_price: rewritten.ticket_price,
          opening_hours: rewritten.opening_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', attr.id)
        .select();

      if (error) {
        console.error(`❌ [${attr.name}] 更新失敗:`, error.message);
        failCount++;
        results.push({ name: attr.name, status: 'failed', error: error.message });
      } else {
        console.log(`✅ [${attr.name}] 更新成功`);
        successCount++;
        results.push({ 
          name: attr.name, 
          status: 'success',
          description: rewritten.description.substring(0, 80) + '...'
        });
      }
      
      // 避免過快請求
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`❌ [${attr.name}] 發生錯誤:`, err.message);
      failCount++;
      results.push({ name: attr.name, status: 'error', error: err.message });
    }
  }

  console.log(`\n${country === 'indonesia' ? '🇮🇩 印尼' : '🇵🇭 菲律賓'} 更新完成：成功 ${successCount} 個，失敗 ${failCount} 個\n`);
  
  return { successCount, failCount, results };
}

async function main() {
  const data = JSON.parse(fs.readFileSync('attractions-to-rewrite.json', 'utf8'));
  
  console.log('🚀 開始批量重寫印尼+菲律賓景點...\n');
  
  // 先處理印尼
  const indoResult = await updateDatabase(data.indonesia, 'indonesia');
  
  // 再處理菲律賓
  const philResult = await updateDatabase(data.philippines, 'philippines');
  
  // 保存結果
  const finalReport = {
    timestamp: new Date().toISOString(),
    indonesia: {
      total: data.indonesia.length,
      success: indoResult.successCount,
      failed: indoResult.failCount,
      results: indoResult.results
    },
    philippines: {
      total: data.philippines.length,
      success: philResult.successCount,
      failed: philResult.failCount,
      results: philResult.results
    }
  };
  
  fs.writeFileSync('rewrite-results.json', JSON.stringify(finalReport, null, 2));
  
  console.log('\n📊 最終報告：');
  console.log(`🇮🇩 印尼：成功 ${indoResult.successCount}/${data.indonesia.length}`);
  console.log(`🇵🇭 菲律賓：成功 ${philResult.successCount}/${data.philippines.length}`);
  console.log(`\n✅ 完整報告已保存：rewrite-results.json`);
}

main();
