/**
 * RLS Rewrite Preview (DRY-RUN)
 *
 * 從 capability-derivation.tableToModule 推算每張表的 module、
 * 產出標準 4-policy SQL preview。**不直接 apply**。
 *
 * 跑法：npx tsx scripts/rls-preview.ts > docs/_session/_rls_rewrite_preview.sql
 */

function tableToModule(table: string): string | null {
  const t = table.toLowerCase()
  if (t === 'calendar_events') return 'calendar'
  if (t === 'todos' || t === 'todo_columns' || t === 'tasks') return 'todos'
  if (t === 'visas') return 'visas'
  if (t === 'tours' || t.startsWith('tour_') || t === 'itineraries' || t === 'quotes' ||
      t === 'cost_templates' || t === 'contracts' || t === 'leader_availability') return 'tours'
  if (t === 'orders' || t === 'order_members') return 'orders'
  if (t.startsWith('payment_') || t === 'receipts' || t === 'disbursement_orders' ||
      t === 'linkpay_logs' || t === 'vendor_costs' || t === 'payment_methods' ||
      t === 'bank_accounts' || t === 'expense_categories' || t === 'travel_invoices') return 'finance'
  if (t.startsWith('accounting_') || t.startsWith('journal_') || t === 'chart_of_accounts' ||
      t === 'checks') return 'accounting'
  if (t === 'employees' || t === 'workspace_roles' || t === 'workspace_attendance_settings') return 'hr'
  if (t === 'customers' || t === 'attractions' || t === 'hotels' || t === 'restaurants' ||
      t === 'michelin_restaurants' || t === 'suppliers' || t === 'supplier_categories' ||
      t === 'countries' || t === 'cities' || t === 'regions' || t === 'airport_images' ||
      t === 'image_library' || t === 'transportation_rates' || t === 'premium_experiences' ||
      t === 'tour_leaders') return 'database'
  if (t === 'bulletins' || t === 'notes' || t === 'rich_documents' || t === 'knowledge_base') return 'office'
  return null
}

function moduleToCapPrefix(table: string, mod: string): string {
  if (mod === 'database') {
    if (table === 'customers') return 'database.customers'
    if (table === 'attractions') return 'database.attractions'
    if (table === 'suppliers' || table === 'supplier_categories') return 'database.suppliers'
    return 'database'
  }
  return mod
}

async function fetchTables(): Promise<string[]> {
  const res = await fetch('https://api.supabase.com/v1/projects/wzvwmawpkapcmkfmkvav/database/query', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sbp_1c1e200c40ff32c86d73cae6a7bb4dbbe18fa487',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity ORDER BY c.relname;`,
    }),
  })
  const data = (await res.json()) as Array<{ relname: string }>
  return data.map(r => r.relname)
}

async function main() {
  const tables = await fetchTables()
  const lines: string[] = []
  lines.push('-- ============================================================================')
  lines.push('-- RLS Rewrite Preview (DRY-RUN、不要直接 apply)')
  lines.push('-- 從 MODULES + capability-derivation.tableToModule 自動推算')
  lines.push('-- 產出標準 4-policy（platform_admin_all + tenant_read + tenant_write）')
  lines.push('-- William 拍板「跑」之後存成 migration apply')
  lines.push('-- ============================================================================\n')

  let mapped = 0
  const unmapped: string[] = []

  for (const table of tables) {
    const mod = tableToModule(table)
    if (!mod) {
      unmapped.push(table)
      continue
    }
    mapped++
    const cap = moduleToCapPrefix(table, mod)
    lines.push(`-- ${table} → ${cap}`)
    lines.push(`DROP POLICY IF EXISTS "platform_admin_all" ON public.${table};`)
    lines.push(`DROP POLICY IF EXISTS "tenant_read" ON public.${table};`)
    lines.push(`DROP POLICY IF EXISTS "tenant_write" ON public.${table};`)
    lines.push(`CREATE POLICY "platform_admin_all" ON public.${table} FOR ALL TO authenticated USING (is_super_admin());`)
    lines.push(`CREATE POLICY "tenant_read" ON public.${table} FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, '${cap}.read'));`)
    lines.push(`CREATE POLICY "tenant_write" ON public.${table} FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, '${cap}.write'));`)
    lines.push('')
  }

  lines.push(`-- ============================================================================`)
  lines.push(`-- 統計：${tables.length} 張表 RLS 開、${mapped} 對應到業務 module、${unmapped.length} 未對應`)
  lines.push(`-- 未對應（系統 / 平台 / 模糊、保持現狀不重寫）：`)
  for (const t of unmapped) lines.push(`--   ${t}`)
  lines.push(`-- ============================================================================`)

  console.log(lines.join('\n'))
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
