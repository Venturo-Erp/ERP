# Development Guide — 自動化開發系統

**不再靠記憶，靠系統**

---

## 🤖 自動化系統（已部署）

### 1. Pre-commit Hook（強制執行）
**位置**：`.husky/pre-commit`

**自動檢查**：
- ✅ TypeScript type check（整個專案）
- ✅ ESLint（staged files）
- ✅ 禁止 `@ts-expect-error`（自動拒絕 commit）
- ✅ 檢查 Next.js 15 params 問題（警告）

**無法繞過**：hook 失敗 = commit 失敗

---

### 2. Migration Wrapper（自動更新 types）
**指令**：`./scripts/run-migration.sh <migration-file.sql>`

**自動執行**：
1. ✅ 執行 migration
2. ✅ **立即**重新生成 Supabase types
3. ✅ 提示檢查變更

**不需要手動記得更新 types**

---

### 3. VSCode Snippets（自動產生正確程式碼）
**位置**：`.vscode/nextjs15.code-snippets`

**可用 snippets**：
- `nxpage` → Server Component with params
- `nxpagefull` → Server Component with params + searchParams
- `nxapi` → API Route with params

**保證**：產生的程式碼都是 Next.js 15 正確語法

---

### 4. Types 自動更新工具
**指令**：`node scripts/regenerate-supabase-types.mjs`

**用途**：手動執行 migration 後更新 types

---

## 📋 開發流程（自動化）

### 寫 Next.js 15 程式碼
```typescript
// 1. 打 snippet：nxpage + Tab
// 2. 自動產生正確程式碼：
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}
```

### 執行 Migration
```bash
# ❌ 舊方式（會忘記更新 types）
node scripts/exec-migration.mjs

# ✅ 新方式（自動更新 types）
./scripts/run-migration.sh supabase/migrations/xxx.sql
```

### Commit 程式碼
```bash
git add -A
git commit -m "feat: ..."

# Pre-commit hook 自動檢查：
# ✅ TypeScript type check
# ✅ ESLint
# ✅ 禁止 @ts-expect-error
# ✅ Next.js 15 params 警告

# 全部通過 → commit 成功
# 任何失敗 → commit 拒絕
```

---

## 🚫 系統禁止的行為

| 行為 | 系統反應 |
|------|---------|
| 使用 `@ts-expect-error` | ❌ Pre-commit hook 拒絕 commit |
| TypeScript 有錯誤 | ❌ Pre-commit hook 拒絕 commit |
| Migration 不更新 types | ⚠️ 使用 wrapper script 自動更新 |
| 手動寫 Next.js 15 params | 💡 用 snippet 自動產生 |

---

## 📊 成效對比

### 舊流程（靠記憶）
```
寫程式 → 忘記 await params → Commit → Push
→ Vercel 部署失敗 → 查錯誤 → 修正 → 重新部署
時間：2-3 小時
```

### 新流程（自動化）
```
打 snippet → 自動產生正確程式碼 → Commit
→ Pre-commit 檢查 → 全部通過 → Push → Vercel 成功
時間：5 分鐘
```

**效率提升**：24-36 倍

---

## 🎯 重要提醒

1. **不要用 `--no-verify`**
   - Hook 失敗是因為有問題，不是因為 hook 太嚴格
   - 修正問題，不要繞過檢查

2. **Migration 一律用 wrapper script**
   - `./scripts/run-migration.sh` 自動更新 types
   - 不要手動跑 migration

3. **寫 Next.js 15 用 snippet**
   - `nxpage`、`nxpagefull`、`nxapi`
   - 保證正確語法

4. **遇到 TypeScript 錯誤**
   - 不要用 `@ts-expect-error`
   - 修正型別定義或更新 types

---

## 🔧 故障排除

### Pre-commit hook 失敗
```bash
# 1. 查看錯誤訊息
# 2. 修正錯誤（不要繞過）
# 3. 重新 commit

# 如果是 types 問題：
node scripts/regenerate-supabase-types.mjs
npm run type-check
```

### Migration wrapper 失敗
```bash
# 檢查 migration SQL 語法
# 修正後重新執行
./scripts/run-migration.sh supabase/migrations/xxx.sql
```

---

**建立時間**：2026-03-18 20:52  
**維護者**：Matthew  
**目的**：不再重複犯錯，系統強制正確
