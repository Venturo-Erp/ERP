#!/usr/bin/env tsx
/**
 * 租戶隔離安全審查
 * 掃描所有 API routes，檢查是否正確過濾 workspace_id
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

interface SecurityIssue {
  file: string
  type: 'missing_workspace_filter' | 'service_role_without_filter' | 'no_auth_check'
  severity: 'high' | 'medium' | 'low'
  line?: number
  detail: string
}

const issues: SecurityIssue[] = []
const srcDir = join(process.cwd(), 'src/app/api')

// 排除清單（公開 API 或 webhook）
const WHITELIST = [
  'linkpay/webhook',
  'auth/line/callback',
  'quotes/confirmation/customer', // 公開確認端點
  'gemini/generate-image', // 內部工具
  'settings/env', // 內部設定
]

function scanDirectory(dir: string) {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      scanDirectory(fullPath)
    } else if (entry === 'route.ts') {
      scanRouteFile(fullPath)
    }
  }
}

function scanRouteFile(filePath: string) {
  const relativePath = filePath.replace(srcDir + '/', '')
  
  // 檢查是否在白名單
  if (WHITELIST.some(w => relativePath.includes(w))) {
    return
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  // 檢查是否有身份驗證
  const hasAuth = content.includes('getServerAuth()') || content.includes('createApiClient()')
  const usesServiceRole = content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('supabaseAdmin')
  const hasWorkspaceFilter = content.includes('workspace_id') || content.includes('workspaceId')

  // 檢查 HTTP 方法
  const hasMethods = {
    GET: content.includes('export async function GET'),
    POST: content.includes('export async function POST'),
    PUT: content.includes('export async function PUT'),
    PATCH: content.includes('export async function PATCH'),
    DELETE: content.includes('export async function DELETE'),
  }

  const methodCount = Object.values(hasMethods).filter(Boolean).length

  if (methodCount === 0) return

  // 規則 1: 沒有身份驗證
  if (!hasAuth && !usesServiceRole) {
    issues.push({
      file: relativePath,
      type: 'no_auth_check',
      severity: 'high',
      detail: '沒有任何身份驗證機制',
    })
  }

  // 規則 2: 使用 service role 但沒有過濾 workspace_id
  if (usesServiceRole && !hasWorkspaceFilter) {
    issues.push({
      file: relativePath,
      type: 'service_role_without_filter',
      severity: 'high',
      detail: '使用 service_role_key 但未過濾 workspace_id（會洩露跨租戶資料）',
    })
  }

  // 規則 3: 使用 createApiClient 但沒提到 workspace（可能依賴 RLS，但需確認）
  if (content.includes('createApiClient') && !hasWorkspaceFilter) {
    // 檢查是否有 .eq('workspace_id', ...) 或 .filter()
    const hasExplicitFilter = /\.eq\(['"]workspace_id['"]/.test(content)
    
    if (!hasExplicitFilter) {
      issues.push({
        file: relativePath,
        type: 'missing_workspace_filter',
        severity: 'medium',
        detail: '使用 createApiClient，依賴 RLS 但未顯式過濾（建議加上 .eq("workspace_id", workspaceId)）',
      })
    }
  }
}

// 執行掃描
console.log('🔍 開始掃描租戶隔離漏洞...\n')
scanDirectory(srcDir)

// 輸出結果
console.log(`\n📊 掃描結果`)
console.log(`========================================`)
console.log(`高風險: ${issues.filter(i => i.severity === 'high').length}`)
console.log(`中風險: ${issues.filter(i => i.severity === 'medium').length}`)
console.log(`低風險: ${issues.filter(i => i.severity === 'low').length}`)
console.log(`========================================\n`)

if (issues.length === 0) {
  console.log('✅ 沒有發現安全問題')
  process.exit(0)
}

// 按嚴重程度排序
issues.sort((a, b) => {
  const order = { high: 0, medium: 1, low: 2 }
  return order[a.severity] - order[b.severity]
})

for (const issue of issues) {
  const icon = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️'
  console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}`)
  console.log(`   ${issue.detail}\n`)
}

process.exit(1)
