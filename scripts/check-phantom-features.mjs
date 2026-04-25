#!/usr/bin/env node
/**
 * 半完成 UI 偵測（phantom feature detector）
 *
 * 找：
 * - component 內的 useState 帶「業務值」預設值（中文 / 純數字 / 帶單位字串）
 * - 該檔案內 沒有任何 DB 寫入呼叫（supabase.update / insert / upsert / .from(...).update(...)
 *   或任何 update / save / submit / persist 系列函式呼叫）
 * - 也沒有把該 state 傳出去給其他組件 save
 *
 * 用法：node scripts/check-phantom-features.mjs
 *
 * 已知範例：QuoteDetailEmbed 的 insurance hardcode 200萬旅責險（2026-04-24 已修）
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'

function color(text, c) {
  const codes = { red: 31, yellow: 33, green: 32, gray: 90, bold: 1, cyan: 36 }
  return `\x1b[${codes[c] || 0}m${text}\x1b[0m`
}

const files = execSync(`find src -type f \\( -name "*.tsx" -o -name "*.ts" \\)`, {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)

// 抽出 useState 預設值
//   const [insuranceText, setInsuranceText] = useState<string>('200萬旅責險+20萬意外醫療')
//   const [count, setCount] = useState(20)
//   const [name, setName] = useState('預設名稱')
const STATE_PATTERN =
  /const\s+\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*useState(?:<[^>]+>)?\s*\(\s*([^)]+?)\s*\)/g

// 「業務值」初值判斷
function isBusinessValue(initial) {
  // 字串：含中文、含「萬/元/天/人」等業務單位、長度 > 4
  if (initial.match(/^['"`]([^'"`]+)['"`]$/)) {
    const str = RegExp.$1
    if (str.match(/[一-鿿]/) || str.match(/萬|元|天|人|％|%|歲/)) return true
    if (str.length > 8) return true // 長字串可能業務 default
  }
  // 純數字 > 1（排除 0/-1/1 這種 UI 計數初值）
  if (initial.match(/^\d+$/) && parseInt(initial) > 10) return true
  return false
}

// 純 UI 狀態 state 名（白名單忽略）
const UI_STATE_HINT = /isOpen|isLoading|loading|hover|focus|selected|expanded|active|visible|show|page|tab|index|cursor|dragging|saving|dialog|menu|tooltip|preview|searchTerm|filter|sort|debounce/i

// 該檔案是否有 DB 寫入跡象
function hasDbWrite(content) {
  return (
    /\bsupabase[\s\S]*?\.(update|insert|upsert|delete)\s*\(/.test(content) ||
    /\bupdate(?:Tour|Quote|Order|Customer|Member|Receipt|Payment|Itinerary|Employee|Supplier)\s*\(/.test(
      content
    ) ||
    /\bcreate(?:Tour|Quote|Order|Customer|Member|Receipt|Payment|Itinerary|Employee|Supplier)\s*\(/.test(
      content
    ) ||
    /\b(useQuoteSave|useTourSave|onSubmit|handleSave|handleSubmit|persistToDb)\b/.test(content)
  )
}

const findings = []

for (const file of files) {
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  // 排除 hooks / services / utils（通常本來就不存檔、是 helper）
  if (
    file.includes('/utils/') ||
    file.includes('/services/') ||
    file.includes('/types/') ||
    file.includes('/constants/') ||
    file.endsWith('.test.tsx') ||
    file.endsWith('.test.ts')
  )
    continue

  // 必須是 React component（含 useState）
  if (!content.includes('useState')) continue

  // 抽出所有 state
  STATE_PATTERN.lastIndex = 0
  let m
  const states = []
  while ((m = STATE_PATTERN.exec(content)) !== null) {
    const [, name, initial] = m
    if (UI_STATE_HINT.test(name)) continue
    if (!isBusinessValue(initial.trim())) continue
    states.push({ name, initial: initial.trim().slice(0, 60) })
  }

  if (states.length === 0) continue
  if (hasDbWrite(content)) continue // 有寫入跡象、跳過

  findings.push({ file, states })
}

console.log(color('=== 半完成 UI 偵測（phantom feature）===', 'bold'))
console.log()
console.log(`掃描 ${files.length} 個 .ts/.tsx 檔案`)
console.log(`候選 ${findings.length} 個檔案有「業務 state、但檔案內無 DB 寫入跡象」`)
console.log()
console.log(color('▶ 怎麼判讀', 'gray'))
console.log(color('  - 真 phantom：state 給 UI 用、但永遠不會被存到 DB（重整就不見）', 'gray'))
console.log(color('  - 假 phantom：state 透過 props 傳出去給父層存（看父層 component）', 'gray'))
console.log(color('  - 噪音：純 UI 邏輯但用了業務數字（少見）', 'gray'))
console.log()

findings.sort((a, b) => b.states.length - a.states.length)

for (const { file, states } of findings) {
  console.log(color(`▶ ${file}`, 'cyan'))
  for (const s of states) {
    console.log(`    ${color(s.name, 'yellow').padEnd(40)} = ${color(s.initial, 'gray')}`)
  }
  console.log()
}

console.log(color('=== 統計 ===', 'bold'))
console.log(`候選檔案：${findings.length}`)
console.log(`候選 state 總數：${findings.reduce((s, f) => s + f.states.length, 0)}`)
