# 常見錯誤清單 — 必讀

**這份文件記錄所有曾經犯過的錯誤，以及如何避免**

---

## 🔴 Critical（致命錯誤，會導致部署失敗）

### 1. Next.js 15 params 是 Promise
**錯誤**：
```typescript
const { id } = params  // ❌ 錯誤！
```

**正確**：
```typescript
const { id } = await params  // ✅ 正確
```

**檢查方式**：Pre-commit hook 會警告
**快速修正**：用 snippet `nxpage` 自動產生

---

### 2. Supabase types 未更新
**錯誤**：執行 migration 後忘記更新 types

**正確流程**：
```bash
./scripts/run-migration.sh migration.sql  # 自動更新 types
```

**檢查方式**：手動執行 migration 會忘記，必須用 wrapper script
**快速修正**：`node scripts/regenerate-supabase-types.mjs`

---

### 3. 用 @ts-expect-error 逃避問題
**錯誤**：
```typescript
// @ts-expect-error - workspace_id exists
workspace_id: request.workspace_id
```

**正確**：修正型別定義或更新 types

**檢查方式**：Pre-commit hook 會直接拒絕 commit
**快速修正**：重新生成 types 或修正型別定義

---

### 4. TypeScript 編譯錯誤
**錯誤**：有 TypeScript 錯誤但沒檢查就 commit

**正確流程**：
```bash
npm run type-check  # Commit 前必跑
```

**檢查方式**：Pre-commit hook 強制執行
**快速修正**：查看錯誤訊息，逐一修正

---

## 🟠 High（高風險，容易導致 runtime 錯誤）

### 5. Server Component 用 React hooks
**錯誤**：
```typescript
// src/app/page.tsx（沒有 'use client'）
export default function Page() {
  const [state, setState] = useState()  // ❌ 錯誤！
}
```

**正確**：
```typescript
'use client'  // ✅ 加這行

export default function Page() {
  const [state, setState] = useState()
}
```

**檢查方式**：Pre-commit hook 會警告
**快速修正**：檔案開頭加 `'use client'`

---

### 6. Public page 用 anon key 寫資料
**錯誤**：
```typescript
// src/app/public/xxx/page.tsx
import { createClient } from '@/lib/supabase/client'  // ❌ anon key

const supabase = createClient()
await supabase.from('xxx').insert(...)  // 會被 RLS 擋住
```

**正確**：
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ service role key
)
```

**檢查方式**：Pre-commit hook 會警告
**快速修正**：改用 service role key

---

### 7. DB 欄位名稱錯誤
**錯誤**：
```typescript
const { data } = await supabase
  .from('hotels')
  .select('english_name')  // ❌ 錯誤！實際欄位是 name_en
```

**正確流程**：
1. 先查 Supabase schema（Supabase API 或 dashboard）
2. 確認欄位名稱
3. 再寫 query

**檢查方式**：手動檢查（無法自動化）
**快速修正**：用 Supabase API 查 schema 確認欄位名

---

## 🟡 Medium（中風險，影響程式碼品質）

### 8. console.log 留在 production code
**錯誤**：
```typescript
console.log('Debug:', data)  // ❌ 不應該留在 production
```

**正確**：刪除或改用 proper logging

**檢查方式**：Pre-commit hook 會警告
**快速修正**：刪除 debug log

---

### 9. unused imports
**錯誤**：
```typescript
import { Button } from '@/components/ui/button'  // ❌ 沒用到

export default function Page() {
  return <div>Hello</div>
}
```

**正確**：刪除未使用的 import

**檢查方式**：ESLint 會檢查
**快速修正**：`npm run lint -- --fix`

---

### 10. 未處理的 Promise
**錯誤**：
```typescript
fetch('/api/xxx')  // ❌ 沒有 await 或 .then()
```

**正確**：
```typescript
await fetch('/api/xxx')  // ✅ 處理 Promise
```

**檢查方式**：ESLint 規則（如果啟用）
**快速修正**：加 await 或 .catch()

---

## 📋 完整檢查清單（Commit 前）

```bash
# 1. TypeScript 檢查
npm run type-check

# 2. Lint 檢查
npm run lint

# 3. 查看變更
git diff

# 4. 確認沒有 debug log
git diff | grep -i "console.log"

# 5. Commit（會自動跑 pre-commit hook）
git add -A
git commit -m "..."
```

---

## 🚫 絕對禁止的行為

| 行為 | 後果 | 替代方案 |
|------|------|---------|
| 用 `@ts-expect-error` | Pre-commit 拒絕 | 修正型別或更新 types |
| 用 `--no-verify` commit | 繞過檢查，製造技術債 | 修正錯誤再 commit |
| 手動執行 migration | 忘記更新 types | 用 `./scripts/run-migration.sh` |
| TypeScript 有錯誤就 commit | Vercel 部署失敗 | 先跑 `npm run type-check` |
| Server Component 用 hooks 沒加 'use client' | Runtime 錯誤 | 加 `'use client'` |

---

## 📚 參考資料

- **DEVELOPMENT_GUIDE.md** — 開發流程和工具
- **CHECKLIST.md** — 開發檢查清單（簡化版）
- **memory/2026-03-18-deployment-failures.md** — 今天所有錯誤的完整記錄

---

**更新時間**：2026-03-18 20:52  
**維護者**：Matthew  
**用途**：記錄所有犯過的錯誤，避免重複

---

## 💡 如何使用這份文件

1. **寫程式前**：快速掃一眼 Critical 區塊
2. **遇到問題時**：搜尋關鍵字（Next.js、Supabase、TypeScript）
3. **Code review 時**：檢查是否有這些錯誤模式
4. **新人 onboarding**：第一份必讀文件
