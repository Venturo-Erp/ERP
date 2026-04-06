const fs = require('fs')
const results = JSON.parse(
  fs.readFileSync('/Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json', 'utf8')
)

console.log('=== Checking empty coordinates ===')
results.forEach(r => {
  const hasCoords = r.latitude !== null && r.latitude !== undefined
  if (!hasCoords && r.osm) {
    console.log(`Empty needs update: ${r.name} (id: ${r.id})`)
  }
})
