#!/usr/bin/env node
/**
 * SSOT 雙存讀取偵測（精準版）
 *
 * 目的：找 code 裡用 `obj1?.X ?? obj2?.X` pattern 連讀兩邊的同名欄位 —
 *      這是 SSOT 破碎的現場 smoking gun（fullTour.tier_pricings ?? quote.tier_pricings 就是這次 bug 根因）。
 *
 * 用法：node scripts/check-ssot-duplicates.mjs
 *
 * 輸出：每筆候選含 file:line + 兩個 source object + 重複欄位名
 *
 * 注意：純 grep pattern 偵測，會有 false positive（例如 fallback 預設值），
 *      但比 schema scan 訊號比噪音強很多。
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'

function color(text, c) {
  const codes = { red: 31, yellow: 33, green: 32, gray: 90, bold: 1, cyan: 36 }
  return `\x1b[${codes[c] || 0}m${text}\x1b[0m`
}

// 找 src 裡所有 .ts/.tsx 檔
const files = execSync(`find src -type f \\( -name "*.ts" -o -name "*.tsx" \\)`, {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)

// 偵測 pattern：
//   obj1?.field ?? obj2?.field
//   obj1.field ?? obj2.field
//   obj1?.field ?? obj2.field
// 排除：
//   obj1?.field ?? null / 0 / [] / {} / '' / 預設值
const PATTERN = /(\w+)\??\.(\w+)\s*\?\?\s*(\w+)\??\.(\w+)/g

const findings = []

for (const file of files) {
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m
    PATTERN.lastIndex = 0
    while ((m = PATTERN.exec(line)) !== null) {
      const [full, obj1, field1, obj2, field2] = m
      // 只關注「同名欄位、不同 source object」的 pattern
      if (field1 === field2 && obj1 !== obj2) {
        // 過濾常見 fallback 模式
        if (obj2 === 'undefined' || obj2 === 'null') continue
        findings.push({
          file: file.replace(/^src\//, 'src/'),
          line: i + 1,
          field: field1,
          obj1,
          obj2,
          snippet: line.trim().slice(0, 120),
        })
      }
    }
  }
}

// 排序：按 field + file
findings.sort((a, b) => {
  if (a.field !== b.field) return a.field.localeCompare(b.field)
  return a.file.localeCompare(b.file)
})

console.log(color('=== SSOT 雙存讀取偵測（??  pattern）===', 'bold'))
console.log()
console.log(`掃描 ${files.length} 個 .ts/.tsx 檔案`)
console.log(`找到 ${findings.length} 處可疑「同名欄位 ?? 同名欄位」pattern`)
console.log()

// 按 field 分組
const byField = new Map()
for (const f of findings) {
  if (!byField.has(f.field)) byField.set(f.field, [])
  byField.get(f.field).push(f)
}

console.log(color('按欄位分組（按出現次數排）：', 'bold'))
console.log()

const groups = [...byField.entries()].sort((a, b) => b[1].length - a[1].length)

for (const [field, items] of groups) {
  console.log(color(`▶ ${field}`, 'cyan') + color(`  (${items.length} 處)`, 'gray'))
  for (const it of items) {
    console.log(
      `    ${color(it.file, 'gray')}:${it.line}   ${color(it.obj1, 'yellow')} ?? ${color(it.obj2, 'yellow')}`
    )
    console.log(`      ${color(it.snippet, 'gray')}`)
  }
  console.log()
}

console.log(color('=== 統計 ===', 'bold'))
console.log(`不同欄位數：${byField.size}`)
console.log(`總出現處：${findings.length}`)
console.log()
console.log(color('▶ 怎麼判讀', 'bold'))
console.log('  - 高度可疑：obj1 = fullTour、obj2 = quote 這種跨表讀取')
console.log('  - 一般 fallback：obj1 = data、obj2 = props 這種同 entity 內 fallback、可忽略')
console.log('  - 真 SSOT 破碎特徵：兩個 obj 對應不同 DB 表、且兩邊都會寫')
