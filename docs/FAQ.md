# ❓ Venturo 專案常見問題 (FAQ)

> **更新日期**: 2025-10-26
> **版本**: 1.0.0

---

## 📚 目錄

- [開發環境](#開發環境)
- [專案啟動](#專案啟動)
- [測試相關](#測試相關)
- [部署相關](#部署相關)
- [常見錯誤](#常見錯誤)
- [效能優化](#效能優化)
- [資料庫相關](#資料庫相關)

---

## 開發環境

### Q: 需要什麼版本的 Node.js？

**A**: 建議使用 **Node.js 20.x** 或更高版本。

```bash
# 檢查 Node.js 版本
node --version  # 應該是 v20.x.x

# 使用 nvm 安裝正確版本
nvm install 20
nvm use 20
```

### Q: 如何安裝專案依賴？

**A**: 使用 npm install：

```bash
# 清除舊的依賴
rm -rf node_modules package-lock.json

# 重新安裝
npm install
```

### Q: 開發時應該使用哪個端口？

**A**: 專案固定使用 **port 3000**。

```bash
# 如果 port 3000 被佔用
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

---

## 專案啟動

### Q: 如何啟動開發服務器？

**A**:

```bash
# 標準啟動
npm run dev

# 在瀏覽器開啟
open http://localhost:3000  # macOS
start http://localhost:3000 # Windows
```

### Q: 首次啟動需要做什麼設定？

**A**:

1. **設定環境變數** (.env.local)

```bash
cp .env.example .env.local
# 編輯 .env.local 填入你的 Supabase 資訊
```

2. **初始化資料庫**

```bash
npm run db:init
```

3. **啟動專案**

```bash
npm run dev
```

### Q: Storybook 怎麼啟動？

**A**:

```bash
# 啟動 Storybook
npm run storybook

# 會在 http://localhost:6006 開啟
```

---

## 測試相關

### Q: 如何運行測試？

**A**:

```bash
# 運行所有測試
npm test

# 運行測試並生成覆蓋率報告
npm run test:coverage

# Watch mode (開發時使用)
npm run test:ui
```

### Q: 測試失敗怎麼辦？

**A**:

1. **檢查錯誤訊息**

```bash
npm test -- --reporter=verbose
```

2. **常見原因**:
   - Mock 設定錯誤
   - 環境變數缺失
   - 依賴版本不匹配

3. **清除快取重試**:

```bash
npm test -- --clearCache
```

### Q: 如何寫新的測試？

**A**:

```typescript
// src/stores/selectors/__tests__/example.test.ts
import { describe, it, expect } from 'vitest'

describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })
})
```

---

## 部署相關

### Q: 如何建置生產版本？

**A**:

```bash
# 建置
npm run build

# 檢查建置結果
npm run start
```

### Q: 部署到 Vercel 需要什麼設定？

**A**:

1. **環境變數** (在 Vercel Dashboard 設定)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. **Build 設定**

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Q: CI/CD 如何運作？

**A**:

專案使用 GitHub Actions 自動化：

- **Pull Request**: 自動測試 + Lint + Bundle Size 檢查
- **Push to main**: 自動測試 + 建置 + 部署

查看 `.github/workflows/ci.yml` 了解詳情。

---

## 常見錯誤

### Q: 遇到 "Port 3000 is already in use" 怎麼辦？

**A**:

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# 或者使用其他端口
npm run dev -- --port 3001
```

### Q: Supabase 連接失敗？

**A**:

1. **檢查環境變數**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. **檢查 Supabase 狀態**
   - 前往 Supabase Dashboard
   - 確認專案運行中
   - 檢查 API keys 是否正確

3. **測試連接**

```typescript
import { supabase } from '@/lib/supabase/client'
const { data, error } = await supabase.from('employees').select('*')
console.log(data, error)
```

### Q: TypeScript 錯誤太多怎麼辦？

**A**:

```bash
# 運行 type check
npm run type-check

# 常見解決方法
1. 更新 @types 套件
2. 檢查 tsconfig.json 設定
3. 重啟 VSCode TypeScript server (Cmd+Shift+P > Restart TS Server)
```

### Q: ESLint 錯誤如何修復？

**A**:

```bash
# 自動修復
npm run lint:fix

# 如果無法修復，檢查
1. eslint.config.mjs 設定
2. .eslintignore 是否正確
3. 是否需要更新 ESLint 規則
```

---

## 效能優化

### Q: 如何檢查 Bundle Size？

**A**:

```bash
# 建置並分析
ANALYZE=true npm run build

# 會開啟 bundle analyzer
```

### Q: 頁面載入太慢怎麼辦？

**A**:

1. **使用 Dynamic Import**

```typescript
const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  { loading: () => <Skeleton />, ssr: false }
);
```

2. **檢查 Network Tab**
   - 大型圖片 → 使用 Next.js Image
   - 重複請求 → 添加快取
   - API 慢 → 添加 loading state

3. **使用 React DevTools Profiler**
   - 找出 re-render 次數多的組件
   - 添加 useMemo/useCallback

### Q: 如何提升開發速度？

**A**:

1. **Fast Refresh** 自動啟用
2. **使用 TypeScript** 自動補全
3. **使用 Storybook** 獨立開發組件
4. **使用測試** 快速驗證邏輯

---

## 資料庫相關

### Q: 如何查看資料庫資料？

**A**:

```bash
# 方法 1: Supabase Dashboard
https://app.supabase.com/project/YOUR_PROJECT/editor

# 方法 2: 使用 Supabase CLI
npx supabase db dump --data-only

# 方法 3: 直接查詢
npm run db:query "SELECT * FROM employees LIMIT 10"
```

### Q: 如何執行 Migration？

**A**:

```bash
# 創建新 migration
npx supabase migration new your_migration_name

# 應用 migration
npm run supabase:push

# 查看 migration 狀態
npx supabase migration list
```

### Q: IndexedDB 資料如何查看？

**A**:

1. **Chrome DevTools**
   - 開啟 DevTools (F12)
   - Application → Storage → IndexedDB
   - 選擇 `VenturoOfflineDB`

2. **程式碼查詢**

```typescript
import { localDB } from '@/services/storage'
const employees = await localDB.getAll('employees')
console.log(employees)
```

### Q: Offline-First 如何運作？

**A**:

1. **資料載入**: IndexedDB (快) → Supabase (慢)
2. **資料寫入**: IndexedDB (立即) → Supabase (背景同步)
3. **衝突處理**: Last-write-wins (最後寫入優先)

```typescript
// 使用 sync helper
import { loadWithSync } from '@/stores/utils/sync-helper'

const { cached, fresh } = await loadWithSync({
  tableName: 'employees',
  filter: { field: 'is_active', value: true },
})

// cached 立即可用，fresh 背景同步
```

---

## 🔧 進階問題

### Q: 如何貢獻代碼？

**A**:

1. Fork 專案
2. 創建 feature branch: `git checkout -b feature/amazing-feature`
3. 提交變更: `git commit -m 'Add amazing feature'`
4. Push 到 branch: `git push origin feature/amazing-feature`
5. 開啟 Pull Request

### Q: 如何報告 Bug？

**A**:

在 GitHub Issues 創建新 issue，包含：

- Bug 描述
- 重現步驟
- 預期行為
- 實際行為
- 截圖 (如果有)
- 環境資訊 (OS, Browser, Node 版本)

### Q: 如何取得幫助？

**A**:

1. **查看文件**:
   - README.md
   - DEVELOPMENT_STANDARDS.md
   - CODE_SPLITTING_STRATEGY.md

2. **GitHub Issues**: 搜尋類似問題
3. **開發團隊**: 聯繫維護者

---

## 📚 相關資源

- [Next.js 文件](https://nextjs.org/docs)
- [Supabase 文件](https://supabase.com/docs)
- [TypeScript 文件](https://www.typescriptlang.org/docs)
- [Vitest 文件](https://vitest.dev)
- [Storybook 文件](https://storybook.js.org/docs)

---

**最後更新**: 2025-10-26
**維護者**: Development Team
**有問題嗎？** 請開啟 GitHub Issue 或聯繫維護者
