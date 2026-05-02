# 🚀 Venturo 快速開始指南

> **5 分鐘內啟動並運行 Venturo 專案**

---

## 📋 前置需求

確保你已安裝：

- ✅ **Node.js 20.x** 或更高版本
- ✅ **npm** 或 **yarn**
- ✅ **Git**

```bash
# 檢查版本
node --version  # v20.x.x
npm --version   # 10.x.x
git --version   # 2.x.x
```

---

## ⚡ 快速啟動 (3 步驟)

### 1️⃣ 克隆專案

```bash
git clone https://github.com/your-org/venturo.git
cd venturo
```

### 2️⃣ 安裝依賴

```bash
npm install
```

### 3️⃣ 啟動開發服務器

```bash
npm run dev
```

🎉 打開 [http://localhost:3000](http://localhost:3000) 開始使用！

---

## 🔧 完整設定 (建議)

### 1. 設定環境變數

```bash
# 複製範例檔案
cp .env.example .env.local

# 編輯 .env.local
nano .env.local
```

**必要的環境變數**:

```env
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 認證模式
AUTH_MODE=supabase
```

### 2. 初始化資料庫

```bash
# 執行資料庫設定
npm run db:init
```

### 3. 啟動專案

```bash
# 開發模式
npm run dev

# 生產建置
npm run build
npm run start
```

---

## 🧪 運行測試

```bash
# 運行所有測試
npm test

# 測試覆蓋率
npm run test:coverage

# 互動式測試 UI
npm run test:ui
```

---

## 📚 啟動 Storybook

```bash
npm run storybook
```

在 [http://localhost:6006](http://localhost:6006) 查看組件庫

---

## 🎯 常用指令

| 指令                 | 說明                |
| -------------------- | ------------------- |
| `npm run dev`        | 啟動開發服務器      |
| `npm run build`      | 建置生產版本        |
| `npm run start`      | 啟動生產服務器      |
| `npm test`           | 運行測試            |
| `npm run lint`       | 檢查代碼品質        |
| `npm run lint:fix`   | 自動修復 lint 錯誤  |
| `npm run type-check` | TypeScript 類型檢查 |
| `npm run storybook`  | 啟動 Storybook      |

---

## 📁 專案結構

```
venturo/
├── src/
│   ├── app/              # Next.js App Router 頁面
│   ├── components/       # React 組件
│   │   ├── ui/          # 基礎 UI 組件
│   │   ├── layout/      # 佈局組件
│   │   └── workspace/   # 工作空間組件
│   ├── features/        # 功能模組
│   ├── stores/          # Zustand 狀態管理
│   ├── hooks/           # 自定義 Hooks
│   ├── lib/             # 工具函數
│   └── types/           # TypeScript 類型定義
├── public/              # 靜態資源
├── tests/               # 測試檔案
└── .storybook/          # Storybook 配置
```

---

## 🎨 開發工作流程

### 1. 創建新功能

```bash
# 創建 feature branch
git checkout -b feature/my-new-feature

# 開發...
npm run dev

# 測試
npm test

# Lint 檢查
npm run lint:fix
```

### 2. 提交代碼

```bash
# Pre-commit hooks 會自動運行
git add .
git commit -m "feat: add my new feature"

# Push
git push origin feature/my-new-feature
```

### 3. 開啟 Pull Request

- CI/CD 會自動運行測試
- Bundle size 檢查
- Code quality 檢查

---

## 🔥 開發技巧

### 使用 Dynamic Import 優化載入

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### 使用 Memoization 優化性能

```typescript
import { useMemo, useCallback } from 'react'

const expensiveValue = useMemo(() => computeExpensiveValue(a, b), [a, b])

const handleClick = useCallback(() => {
  doSomething(a)
}, [a])
```

### 使用 Zustand Selectors

```typescript
// ❌ 避免 - 會導致不必要的 re-render
const store = useStore()

// ✅ 推薦 - 只在需要的數據改變時 re-render
const items = useStore(state => state.items)
```

---

## 🐛 常見問題

### Port 3000 被佔用

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# 或使用其他端口
npm run dev -- --port 3001
```

### 依賴安裝失敗

```bash
# 清除並重新安裝
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 錯誤

```bash
# 重啟 TypeScript server
# VSCode: Cmd+Shift+P > "TypeScript: Restart TS Server"

# 或重新建置
npm run type-check
```

---

## 📖 進階學習

### 推薦閱讀順序

1. ✅ **QUICK_START.md** (你在這裡！)
2. 📚 **README.md** - 專案概述
3. 🏗️ **DEVELOPMENT_STANDARDS.md** - 開發規範
4. ⚡ **CODE_SPLITTING_STRATEGY.md** - 性能優化
5. 🎯 **PATH_TO_100.md** - 達到完美分數
6. ❓ **FAQ.md** - 常見問題

### 專案文件索引

- **架構設計**: `VENTURO_SYSTEM_INDEX.md`
- **優化報告**: `FINAL_OPTIMIZATION_REPORT.md`
- **問題修復**: `ISSUES_FIXED_REPORT.md`
- **評分報告**: `SCORE_100_ACHIEVED.md`

---

## 🎯 下一步

1. ✅ 完成環境設定
2. 📚 閱讀 `DEVELOPMENT_STANDARDS.md`
3. 🧪 運行測試確保一切正常
4. 🎨 探索 Storybook 了解組件
5. 💻 開始開發！

---

## 🆘 需要幫助？

- 📖 查看 [FAQ](./FAQ.md)
- 🐛 [報告 Bug](https://github.com/your-org/venturo/issues)
- 💬 聯繫開發團隊

---

## 🎉 完成！

恭喜！你已經成功設定 Venturo 開發環境。

**Happy Coding!** 🚀

---

**最後更新**: 2025-10-26
**版本**: 1.0.0
