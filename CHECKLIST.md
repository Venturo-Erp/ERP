# 開發檢查清單

**每次寫程式前必讀！**

---

## 🚀 新增 Server Component / API Route

### Next.js 15 強制檢查
- [ ] `params` 是 Promise → 加 `await params`
- [ ] `searchParams` 是 Promise → 加 `await searchParams`
- [ ] 絕對不要 `const { id } = params` （錯誤）
- [ ] 正確：`const { id } = await params`

### 範例
```typescript
// ❌ 錯誤（會編譯失敗）
export default async function Page({ params }) {
  const { id } = params  // 錯誤！
}

// ✅ 正確
export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params  // 正確
}
```

---

## 🗄️ Supabase Migration

### 執行 Migration 後必做
1. [ ] 執行 migration（任何方式）
2. [ ] **立即重新生成 types**：`node scripts/regenerate-supabase-types.mjs`
3. [ ] **檢查 types 是否更新**：`git diff src/lib/supabase/types.ts`
4. [ ] **本機 type-check**：`npm run type-check`
5. [ ] Commit types 變更

### 絕對不要
- ❌ 用 `@ts-expect-error` 逃避型別錯誤
- ❌ 假設 types 會自動更新
- ❌ 直接 commit 沒跑 type-check

---

## 📝 Commit 前

### 強制檢查
1. [ ] `npm run type-check` — 通過才能 commit
2. [ ] `npm run lint` — 修正 lint 錯誤
3. [ ] 檢查 git diff — 確認沒有無關變更
4. [ ] Commit message 清楚（feat/fix/chore）

### Pre-commit Hook 會自動跑
- TypeScript type check
- ESLint（只檢查 staged files）
- Prettier format

**如果 hook 失敗 → 不要用 `--no-verify`，修正錯誤再 commit**

---

## 🚫 絕對禁止

| 行為 | 後果 | 正確做法 |
|------|------|---------|
| 用 `@ts-expect-error` | 掩蓋問題，Vercel 部署失敗 | 修正型別定義 |
| 跳過 type-check | 推到 GitHub 才發現錯誤 | Commit 前跑 `npm run type-check` |
| Migration 不更新 types | TypeScript 編譯失敗 | 立即跑 `node scripts/regenerate-supabase-types.mjs` |
| `--no-verify` commit | 繞過檢查，製造技術債 | 修正錯誤再 commit |

---

## 📊 自我檢查

**每週問自己**：
- 這週有沒有犯重複的錯誤？
- 有沒有用 workaround 而不是解決根本問題？
- 有沒有因為趕時間而跳過檢查？

**如果答案是 Yes → 重新讀這份清單**

---

**更新時間**：2026-03-18 20:45  
**維護者**：Matthew
