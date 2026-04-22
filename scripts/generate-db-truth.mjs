#!/usr/bin/env node
/**
 * 盤查 Supabase 只讀 metadata、產出 docs/DB_TRUTH.md
 *
 * 🛑 鐵律：只跑 SELECT、絕不 INSERT/UPDATE/DELETE/ALTER、絕不碰租戶 row
 * 🛑 用途：venturo-route-context-verify 的 DB 層 SSOT
 *
 * 用法：
 *   source ~/Projects/venturo-erp/.env.local
 *   node scripts/generate-db-truth.mjs
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT = resolve(__dirname, '..', 'docs', 'DB_TRUTH.md')

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN 未設。請先 `source .env.local`')
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 未設。請先 `source .env.local`')
  process.exit(1)
}
const refMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)
if (!refMatch) {
  console.error(`❌ 不認識的 SUPABASE_URL 格式: ${SUPABASE_URL}`)
  process.exit(1)
}
const PROJECT_REF = refMatch[1]

// === 安全閘：禁止非 SELECT SQL ===
function assertReadOnly(sql) {
  const head = sql.trim().toLowerCase()
  const banned = [
    'insert',
    'update',
    'delete',
    'alter',
    'drop',
    'truncate',
    'create',
    'grant',
    'revoke',
  ]
  for (const kw of banned) {
    if (head.startsWith(kw + ' ') || head.startsWith(kw + '\n')) {
      throw new Error(`🛑 禁止的 SQL 起始關鍵字: ${kw.toUpperCase()}`)
    }
  }
  if (!head.startsWith('select') && !head.startsWith('with')) {
    throw new Error('🛑 SQL 必須以 SELECT 或 WITH 開頭')
  }
}

async function sql(query) {
  assertReadOnly(query)
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase API ${res.status}: ${text}`)
  }
  return res.json()
}

// === Query 定義 ===

const Q_TABLES = `
SELECT tablename AS table_name
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
`

const Q_COLUMNS = `
SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
`

const Q_FKEYS = `
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_schema,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
`

const Q_RLS_STATUS = `
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
`

const Q_POLICIES = `
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`

const Q_TRIGGERS = `
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
`

const Q_FUNCTIONS = `
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns,
  p.prosecdef AS security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'immutable'
    WHEN 's' THEN 'stable'
    WHEN 'v' THEN 'volatile'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
`

const Q_INDEXES = `
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
`

// === Main ===

console.log('🔍 盤查 Supabase metadata (project: ' + PROJECT_REF + ') ...')
const t0 = Date.now()

const [tables, columns, fkeys, rlsStatus, policies, triggers, functions, indexes] =
  await Promise.all([
    sql(Q_TABLES),
    sql(Q_COLUMNS),
    sql(Q_FKEYS),
    sql(Q_RLS_STATUS),
    sql(Q_POLICIES),
    sql(Q_TRIGGERS),
    sql(Q_FUNCTIONS),
    sql(Q_INDEXES),
  ])

const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
console.log(
  `✓ ${tables.length} tables / ${columns.length} cols / ${fkeys.length} fks / ${policies.length} policies / ${triggers.length} triggers / ${functions.length} functions （${elapsed}s）`
)

// === 索引化 ===
const rlsByName = new Map(rlsStatus.map((r) => [r.table_name, r]))
const policiesByTable = new Map()
for (const p of policies) {
  if (!policiesByTable.has(p.tablename)) policiesByTable.set(p.tablename, [])
  policiesByTable.get(p.tablename).push(p)
}
const columnsByTable = new Map()
for (const c of columns) {
  if (!columnsByTable.has(c.table_name)) columnsByTable.set(c.table_name, [])
  columnsByTable.get(c.table_name).push(c)
}
const fkeysByTable = new Map()
for (const f of fkeys) {
  if (!fkeysByTable.has(f.table_name)) fkeysByTable.set(f.table_name, [])
  fkeysByTable.get(f.table_name).push(f)
}
const triggersByTable = new Map()
for (const t of triggers) {
  if (!triggersByTable.has(t.table_name)) triggersByTable.set(t.table_name, [])
  triggersByTable.get(t.table_name).push(t)
}

// === 可疑清單（啟發式）===
const suspicions = []
const KNOWN_GLOBAL = new Set([
  'workspaces',
  'countries',
  'regions',
  'cities',
  'attractions',
  'restaurants',
  '_migrations',
  'employees',
])

for (const t of tables) {
  const name = t.table_name
  const rls = rlsByName.get(name)
  const tablePolicies = policiesByTable.get(name) ?? []
  const cols = columnsByTable.get(name) ?? []
  const hasWorkspaceId = cols.some((c) => c.column_name === 'workspace_id')

  if (!rls?.rls_enabled) {
    suspicions.push({
      level: '🔴',
      table: name,
      issue: 'RLS 沒開（任何登入使用者可能都能看到這張表所有資料）',
    })
  } else if (tablePolicies.length === 0) {
    suspicions.push({
      level: '🔴',
      table: name,
      issue: 'RLS 開了但沒有 policy（行為不明、可能完全擋住或完全放行）',
    })
  }

  if (name === 'workspaces' && rls?.force_rls) {
    suspicions.push({
      level: '🔴',
      table: name,
      issue:
        'workspaces 開了 FORCE RLS、會打斷登入（CLAUDE.md 紅線、必須關）',
    })
  }

  if (
    !KNOWN_GLOBAL.has(name) &&
    !hasWorkspaceId &&
    tablePolicies.length > 0 &&
    rls?.rls_enabled
  ) {
    suspicions.push({
      level: '🟡',
      table: name,
      issue: '沒有 workspace_id 欄位、但有 RLS policy（要確認隔離方式是什麼）',
    })
  }
}

// === 產 Markdown ===
const now = new Date().toISOString().split('T')[0]
const md = []
md.push('# Venturo DB 真相檔（DB_TRUTH.md）')
md.push('')
md.push(`> **自動產生**：${now}`)
md.push(`> **Supabase Project**：\`${PROJECT_REF}\``)
md.push(
  `> **產生方式**：\`node scripts/generate-db-truth.mjs\`（只讀 metadata、不碰 row）`
)
md.push('')
md.push(
  '這份檔是 Venturo 所有 `venturo-route-context-verify` 驗證流程的 **DB 層 SSOT**。每次該 skill 執行時、主 Claude 先跑一次這個腳本、讓 DB 真相永遠最新。'
)
md.push('')
md.push(
  '**給 William 看的白話摘要由 skill 翻譯。這份檔本身是機器讀的原始事實、不給業務主看。**'
)
md.push('')
md.push('---')
md.push('')
md.push('## 🚨 可疑清單（優先看這個）')
md.push('')
if (suspicions.length === 0) {
  md.push(
    '*（沒有被啟發式抓到的可疑項。但這只代表「沒明顯紅線」、不代表 policy 內容都正確。）*'
  )
} else {
  md.push(`共 ${suspicions.length} 項：`)
  md.push('')
  md.push('| 嚴重度 | Table | 問題 |')
  md.push('|---|---|---|')
  for (const s of suspicions) {
    md.push(`| ${s.level} | \`${s.table}\` | ${s.issue} |`)
  }
}
md.push('')
md.push('---')
md.push('')
md.push(`## 📋 Tables 總覽（${tables.length} 張）`)
md.push('')
md.push(
  '| Table | RLS | FORCE | Policy | Columns | workspace_id | created_by FK |'
)
md.push('|---|---|---|---|---|---|---|')
for (const t of tables) {
  const name = t.table_name
  const rls = rlsByName.get(name)
  const p = policiesByTable.get(name) ?? []
  const cols = columnsByTable.get(name) ?? []
  const hasWs = cols.some((c) => c.column_name === 'workspace_id') ? '✓' : ''
  const createdByFk = (fkeysByTable.get(name) ?? []).find(
    (f) => f.column_name === 'created_by'
  )
  const createdByTarget = createdByFk
    ? `${createdByFk.foreign_schema}.${createdByFk.foreign_table}`
    : ''
  md.push(
    `| \`${name}\` | ${rls?.rls_enabled ? '✓' : '✗'} | ${rls?.force_rls ? '⚠️' : ''} | ${p.length} | ${cols.length} | ${hasWs} | ${createdByTarget} |`
  )
}
md.push('')
md.push('---')
md.push('')
md.push('## 📊 每張 Table 詳情')
md.push('')

for (const t of tables) {
  const name = t.table_name
  md.push(`### \`${name}\``)
  md.push('')

  const cols = columnsByTable.get(name) ?? []
  if (cols.length > 0) {
    md.push('**Columns**')
    md.push('')
    md.push('| Column | Type | Nullable | Default |')
    md.push('|---|---|---|---|')
    for (const c of cols) {
      const type =
        c.data_type === 'USER-DEFINED' ? `${c.udt_name} (enum)` : c.data_type
      md.push(
        `| \`${c.column_name}\` | ${type} | ${c.is_nullable} | ${c.column_default ?? '-'} |`
      )
    }
    md.push('')
  }

  const fks = fkeysByTable.get(name) ?? []
  if (fks.length > 0) {
    md.push('**Foreign Keys**')
    md.push('')
    md.push('| Column | References | ON DELETE | ON UPDATE |')
    md.push('|---|---|---|---|')
    for (const f of fks) {
      const ref = `${f.foreign_schema === 'public' ? '' : f.foreign_schema + '.'}${f.foreign_table}.${f.foreign_column}`
      md.push(
        `| \`${f.column_name}\` | \`${ref}\` | ${f.delete_rule} | ${f.update_rule} |`
      )
    }
    md.push('')
  }

  const rls = rlsByName.get(name)
  md.push(
    `**RLS**：\`${rls?.rls_enabled ? 'enabled' : 'disabled'}\`${rls?.force_rls ? ' **（FORCE）**' : ''}`
  )
  md.push('')
  const pols = policiesByTable.get(name) ?? []
  if (pols.length > 0) {
    md.push('**Policies**')
    md.push('')
    for (const p of pols) {
      md.push(`- **${p.policyname}** — \`${p.cmd}\`（roles: ${p.roles}）`)
      if (p.qual) md.push(`    - USING: \`${p.qual}\``)
      if (p.with_check) md.push(`    - WITH CHECK: \`${p.with_check}\``)
    }
    md.push('')
  }

  const trigs = triggersByTable.get(name) ?? []
  if (trigs.length > 0) {
    md.push('**Triggers**')
    md.push('')
    for (const tr of trigs) {
      md.push(`- \`${tr.trigger_name}\` — ${tr.timing} ${tr.event}`)
    }
    md.push('')
  }

  md.push('---')
  md.push('')
}

md.push('')
md.push(`## 🔧 Public Functions（${functions.length} 個）`)
md.push('')
md.push('| Name | Args | Returns | SECURITY DEFINER | Volatility |')
md.push('|---|---|---|---|---|')
for (const f of functions) {
  md.push(
    `| \`${f.function_name}\` | \`${f.args || '-'}\` | \`${f.returns}\` | ${f.security_definer ? '✓' : ''} | ${f.volatility} |`
  )
}
md.push('')

md.push('---')
md.push('')
md.push(`## 📑 Indexes（${indexes.length} 個）`)
md.push('')
md.push('<details><summary>展開看全部</summary>')
md.push('')
md.push('| Table | Index | Definition |')
md.push('|---|---|---|')
for (const i of indexes) {
  md.push(`| \`${i.tablename}\` | \`${i.indexname}\` | \`${i.indexdef}\` |`)
}
md.push('')
md.push('</details>')
md.push('')

writeFileSync(OUTPUT, md.join('\n'))
console.log(`✅ 寫入 ${OUTPUT}`)
console.log(`   ${tables.length} tables / ${policies.length} policies / ${suspicions.length} 可疑項`)
