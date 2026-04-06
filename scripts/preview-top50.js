const data = require('./new-discoveries-thailand.json');

console.log('========================================');
console.log('📋 前 50 個新發現地點預覽');
console.log('========================================\n');

data.slice(0, 50).forEach((d, i) => {
  const name = d.name_zh || d.name_en;
  console.log(`${String(i+1).padStart(2)}. ${name} (${d.cityZh}, ${d.category})`);
});

console.log(`\n... 還有 ${data.length - 50} 個，全部在 JSON 檔`);
