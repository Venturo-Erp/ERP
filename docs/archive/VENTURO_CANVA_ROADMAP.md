# Venturo Canva 開發路線圖

> **目標**：打造一個免費版 Canva，讓設計師上傳模板，建立 UGC 生態系統
> **參考**：rawctl (Lightroom 替代品) - https://github.com/888wing/rawctl

## 願景架構

```
Phase 1: Venturo Designer (ERP 內建)     ← 現在
    ↓ 功能完善
Phase 2: Venturo Studio (獨立公開版)     ← 未來
    ↓ UGC 生態
Phase 3: Venturo Marketplace (模板市集)  ← 長期
```

---

## Phase 1: 打造完整的設計編輯器 (Current)

### ✅ 已完成功能

| 功能         | 狀態 | 說明                          |
| ------------ | ---- | ----------------------------- |
| 基本形狀     | ✅   | 矩形、圓形、橢圓              |
| 文字編輯     | ✅   | 字體、大小、顏色、對齊        |
| 圖片插入     | ✅   | 上傳、裁切、位置調整          |
| 圖層管理     | ✅   | 上移/下移/置頂/置底/鎖定      |
| 對齊功能     | ✅   | 靠左/置中/靠右/靠上/置中/靠下 |
| Smart Guides | ✅   | 移動時自動對齊參考線          |
| 複製/貼上    | ✅   | Ctrl+C/V/X                    |
| 撤銷/重做    | ✅   | Ctrl+Z/Y (useHistory hook)    |
| 群組功能     | ✅   | Ctrl+G / Ctrl+Shift+G         |
| 右鍵選單     | ✅   | Context Menu                  |
| 工具列       | ✅   | EditorToolbar                 |
| 字體選擇器   | ✅   | FontPicker                    |
| 圖片濾鏡     | ✅   | 亮度/對比度/飽和度            |
| 線條元素     | ✅   | 實線/虛線/點線/箭頭           |
| 貼紙/印章    | ✅   | 20+ 預設圖案                  |
| 元素庫       | ✅   | ElementLibrary 組件           |
| 增量渲染     | ✅   | 修改元素不重繪整個畫布        |

### 🔲 待完成功能 (P0 - 核心功能)

| 功能         | 優先級 | 說明                    |
| ------------ | ------ | ----------------------- |
| 多頁面支援   | P0     | 手冊多頁編輯、頁面導航  |
| 模板系統     | P0     | 儲存/載入模板、模板預覽 |
| 圖片裁切工具 | P0     | 自由裁切、比例裁切      |
| 文字特效     | P0     | 陰影、描邊、漸層填色    |
| 匯出功能     | P0     | PNG/JPG/PDF 高品質匯出  |

### 🔲 待完成功能 (P1 - 進階功能)

| 功能       | 優先級 | 說明                     |
| ---------- | ------ | ------------------------ |
| 漸層編輯器 | P1     | 視覺化漸層調整           |
| 遮罩功能   | P1     | 圖片遮罩、形狀遮罩       |
| 路徑編輯   | P1     | 貝茲曲線、自訂形狀       |
| 圖層面板   | P1     | 可視化圖層列表、拖拽排序 |
| 標尺/網格  | P1     | 輔助定位工具             |
| 快捷鍵面板 | P1     | 顯示所有可用快捷鍵       |

### 🔲 待完成功能 (P2 - 專業功能)

| 功能     | 優先級 | 說明                 |
| -------- | ------ | -------------------- |
| 動畫效果 | P2     | 元素進入/離開動畫    |
| 影片支援 | P2     | 嵌入影片元素         |
| 圖表工具 | P2     | 長條圖、圓餅圖       |
| QR Code  | P2     | 生成 QR Code 元素    |
| 品牌套件 | P2     | 一鍵套用品牌色、Logo |
| 協作編輯 | P2     | 多人即時編輯         |

---

## Phase 2: Venturo Studio (公開版)

### 架構設計

```
venturo-studio/
├── apps/
│   └── web/                    # Next.js 前端
├── packages/
│   └── @venturo/designer/      # 共用編輯器核心 (從 ERP 抽出)
│       ├── components/
│       ├── hooks/
│       └── core/
└── supabase/
    └── migrations/             # 公開版資料庫結構
```

### 功能清單

| 功能           | 說明                    |
| -------------- | ----------------------- |
| 用戶註冊/登入  | Email、Google、Facebook |
| 設計師個人頁面 | 作品集、追蹤者          |
| 模板上傳       | 上傳 + 分類 + 標籤      |
| 審核系統       | 系統主管審核模板        |
| 素材庫管理     | 貼紙、圖片、字體上傳    |
| 搜尋/篩選      | 按分類、標籤、熱門度    |
| 社群功能       | 按讚、收藏、評論        |

### 資料庫結構

```sql
-- 設計師
CREATE TABLE designers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  tier TEXT, -- bronze, silver, gold, certified
  template_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
);

-- 公開模板
CREATE TABLE public_templates (
  id UUID PRIMARY KEY,
  designer_id UUID REFERENCES designers,
  name TEXT,
  description TEXT,
  category TEXT, -- brochure, quote, poster, card
  tags TEXT[],
  thumbnail_url TEXT,
  template_data JSONB, -- 模板 JSON
  status TEXT, -- draft, pending, approved, rejected
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
);

-- 公開素材
CREATE TABLE public_stickers (
  id UUID PRIMARY KEY,
  designer_id UUID REFERENCES designers,
  name TEXT,
  category TEXT,
  svg_path TEXT,
  thumbnail_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
);
```

---

## Phase 3: Venturo Marketplace

### 商業模式

```
免費模板/素材
├── 設計師獲得曝光
└── 平台獲得內容

付費模板/素材
├── 設計師獲得 70% 收入
└── 平台獲得 30% 收入

訂閱制 (Venturo Pro)
├── 無限下載付費素材
├── 進階功能解鎖
└── 優先客服支援
```

---

## 技術決策

### 為什麼用 Web 而不是原生？

| 考量     | Web (我們的選擇)    | 原生 (rawctl)   |
| -------- | ------------------- | --------------- |
| 跨平台   | ✅ 自動支援所有平台 | ❌ 需要分別開發 |
| 分發     | ✅ 無需安裝         | ❌ 需要下載     |
| 更新     | ✅ 即時更新         | ❌ 用戶需要更新 |
| 效能     | ⚠️ 較慢但夠用       | ✅ 原生效能     |
| 開發速度 | ✅ 快速迭代         | ❌ 較慢         |

### 核心技術棧

```
前端框架: Next.js 16 + React 19
設計編輯: Fabric.js 6
狀態管理: Zustand 5
樣式: Tailwind CSS
資料庫: Supabase (PostgreSQL)
儲存: Supabase Storage
部署: Vercel
```

---

## 里程碑

### Milestone 1: 完整編輯器 (ERP 內建)

- [ ] 多頁面支援
- [ ] 模板儲存/載入
- [ ] PDF 匯出
- [ ] 圖片裁切工具
- [ ] 文字特效

### Milestone 2: 抽出編輯器套件

- [ ] 建立 @venturo/designer 套件
- [ ] 文檔和範例
- [ ] 單元測試

### Milestone 3: Studio MVP

- [ ] 用戶系統
- [ ] 模板上傳
- [ ] 審核流程
- [ ] 基本搜尋

### Milestone 4: 生態系統

- [ ] 設計師等級制度
- [ ] 付費模板
- [ ] 訂閱制

---

## 參考資源

- [Canva](https://www.canva.com/) - 商業標竿
- [Polotno](https://polotno.com/) - 開源 Canva 替代品
- [rawctl](https://github.com/888wing/rawctl) - Lightroom 替代品架構參考
- [Fabric.js](http://fabricjs.com/) - Canvas 核心庫
- [Konva.js](https://konvajs.org/) - 另一個 Canvas 選項

---

_最後更新: 2026-01-14_
