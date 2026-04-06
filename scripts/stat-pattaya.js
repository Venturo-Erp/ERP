const fs = require('fs')
const results = JSON.parse(
  fs.readFileSync('/Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json', 'utf8')
)

console.log('=== Pattaya Coordinate Statistics ===')
let total = results.length
let alreadyHad = 0
let wasEmptyGot = 0
let wasEmptyStillEmpty = 0

results.forEach(r => {
  if (r.latitude !== null && r.latitude !== undefined) {
    alreadyHad++
  } else {
    if (r.osm) {
      wasEmptyGot++
    } else {
      wasEmptyStillEmpty++
    }
  }
})

console.log(`Total: ${total}`)
console.log(`Already had coordinates: ${alreadyHad}`)
console.log(`Was empty, now got: ${wasEmptyGot} ✅`)
console.log(`Was empty, still empty: ${wasEmptyStillEmpty} ❌`)
