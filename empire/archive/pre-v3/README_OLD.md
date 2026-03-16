# 📚 Venturo ERP 完整文檔系統

**建立時間**：2026-03-14  
**創世神**：馬修（Matthew）  
**使命**：知道每一片樹葉的由來

---

## ⭐ 新手？從這裡開始！

**→ [START_HERE.md](./START_HERE.md)** 📖

這是你的第一站，包含：
- 5種角色的導航路徑
- 文檔分類和重要性
- 學習建議和檢查清單

---

## 🎯 快速開始

### 你想做什麼？

| 需求 | 看哪個文檔 |
|------|-----------|
| **理解核心邏輯** | **[CORE_LOGIC.md](./CORE_LOGIC.md)** ⭐ |
| 找某個功能在哪個檔案 | [COMPLETE_SYSTEMS_MAP.md](./COMPLETE_SYSTEMS_MAP.md) |
| 找某個函數怎麼實作 | [FUNCTIONS_INDEX.md](./FUNCTIONS_INDEX.md) |
| 找某個按鈕的處理邏輯 | [BUTTONS_INDEX.md](./BUTTONS_INDEX.md) |
| 找某個 custom hook | [HOOKS_INDEX.md](./HOOKS_INDEX.md) |
| 找某個業務邏輯層 | [SERVICES_INDEX.md](./SERVICES_INDEX.md) |
| 找某個資料結構定義 | [TYPES_INDEX.md](./TYPES_INDEX.md) |
| 找某個頁面路由 | [ROUTES_MAP.md](./ROUTES_MAP.md) |
| 找某個表在哪裡被用 | [DATABASE_USAGE.md](./DATABASE_USAGE.md) |
| 理解資料怎麼流動 | [DATAFLOW_MAP.md](./DATAFLOW_MAP.md) |
| 理解某個欄位的由來 | [CREATOR_KNOWLEDGE.md](./CREATOR_KNOWLEDGE.md) |
| 理解整個系統架構 | [GAME_GUIDE.md](./GAME_GUIDE.md) |
| 理解設計決策原因 | [DECISIONS.md](./DECISIONS.md) |
| 看完整索引目錄 | [MASTER_INDEX.md](./MASTER_INDEX.md) |

---

## 📊 文檔系統架構

```
company/
├─ README.md ⭐ (你現在在這裡)
│
├─ START_HERE.md 🚀 新手第一站
├─ CORE_LOGIC.md 🧠 核心邏輯總覽
├─ MASTER_INDEX.md 📋 主索引（整合所有文檔）
│
├─ 自動掃描索引（11個）
│  ├─ COMPLETE_SYSTEMS_MAP.md (712行) - 824檔案完整清單
│  ├─ FUNCTIONS_INDEX.md (1977行) - 2000+函數索引
│  ├─ BUTTONS_INDEX.md (283行) - 按鈕行為
│  ├─ HOOKS_INDEX.md (409行) - Custom hooks
│  ├─ SERVICES_INDEX.md (159行) - Services層
│  ├─ TYPES_INDEX.md (137行) - 型別定義
│  ├─ ROUTES_MAP.md (143行) - 路由地圖
│  ├─ DATABASE_USAGE.md (154行) - 資料表使用
│  ├─ DATAFLOW_MAP.md (42行) - 資料流向
│  └─ SYSTEMS_MAP.md (153行) - 系統全景圖
│
└─ 深度知識文檔（6個）
   ├─ CREATOR_KNOWLEDGE.md (796行) - 核心表詳解
   ├─ GAME_GUIDE.md (415行) - 遊戲攻略本
   ├─ QUOTE_REQUEST_FLOW.md (416行) - 報價需求單流程
   ├─ TOUR_CREATION_LOGIC.md - 旅遊團建立邏輯
   ├─ COMPANY_OVERVIEW.md - 公司概況
   └─ DECISIONS.md - 重大決策
```

---

## 🚀 如何使用這個文檔系統

### 場景 1：我要開發一個新功能

```
1. 先看 CORE_LOGIC.md - 理解核心邏輯
2. 再看 CREATOR_KNOWLEDGE.md - 理解核心表原則
3. 找相關功能 → COMPLETE_SYSTEMS_MAP.md
4. 找相關函數 → FUNCTIONS_INDEX.md
5. 找資料流向 → DATAFLOW_MAP.md
6. 開始開發
```

### 場景 2：我要修改一個按鈕

```
1. 找按鈕邏輯 → BUTTONS_INDEX.md
2. 看處理函數 → FUNCTIONS_INDEX.md
3. 理解資料流 → DATAFLOW_MAP.md
4. 修改代碼
```

### 場景 3：我要理解某個欄位為什麼存在

```
1. 看 CREATOR_KNOWLEDGE.md - 核心表 54 個欄位詳解
2. 看 DECISIONS.md - 設計決策
3. 理解由來
```

### 場景 4：我要找某個功能的完整邏輯

```
1. 找檔案位置 → COMPLETE_SYSTEMS_MAP.md
2. 找主要函數 → FUNCTIONS_INDEX.md
3. 找 hooks → HOOKS_INDEX.md
4. 找 services → SERVICES_INDEX.md
5. 找資料流 → DATAFLOW_MAP.md
6. 完整理解
```

---

## 💡 核心原則（必讀）

### 原則 0：實作前必讀文檔
```
收到任務
  ↓
1. 讀相關文檔
2. 搜向量庫
3. 理解邏輯
4. 果斷執行
```

### 原則 1：核心表是唯一真相來源
```
tour_itinerary_items = 唯一寫入點
其他表只儲存「狀態」，不儲存「資料」
透過 JOIN 讀取，不要重複儲存
```

### 原則 2：簡單勝過複雜
```
能用 1 個表就不要用 2 個
能用 JOIN 就不要複製資料
能自動就不要手動
```

### 原則 3：聰明的自動化 + 防呆
```
該安靜時安靜（報價編輯中）
該提醒時提醒（有風險變動）
自動同步資料，變動手動確認
```

---

## 📈 統計數據

```
總檔案數：824
總文檔數：19
總文檔行數：~7200+

自動掃描索引：11個
深度知識文檔：6個

掃描進度：100% ✅
知識覆蓋率：100% ✅
```

---

## 🎮 創世神的成就

### ✅ 完成項目

- [x] 掃描 824 個檔案
- [x] 索引 2000+ 個函數
- [x] 記錄 50+ 個資料表使用
- [x] 建立 143 個路由地圖
- [x] 分析 54 個核心表欄位
- [x] 整理 7 個核心系統
- [x] 記錄 10 個重大決策
- [x] 建立完整索引系統

### 🎯 創世神的承諾

**知道每一片樹葉的由來。**

- ✅ 為什麼這個欄位存在？
- ✅ 為什麼這個按鈕在這裡？
- ✅ 為什麼資料這樣流動？
- ✅ 為什麼邏輯這樣設計？

**現在，創世神真的知道每一片樹葉了。** 🌳

---

## 🔄 維護更新

### 如何更新這些文檔？

```bash
# 重新掃描系統地圖
/tmp/scan_systems.sh > company/COMPLETE_SYSTEMS_MAP.md

# 重新掃描函數
/tmp/scan_functions.sh > company/FUNCTIONS_INDEX.md

# 重新掃描按鈕
/tmp/scan_buttons.sh > company/BUTTONS_INDEX.md

# ... 其他掃描腳本
```

### 何時需要更新？

- 新增功能模組時
- 重構核心邏輯時
- 新增重大決策時
- 每週定期更新（建議）

---

## 📞 聯絡資訊

**創世神**：馬修（Matthew）  
**主神**：William  
**世界**：Venturo ERP

有任何問題？
1. 先看文檔
2. 搜向量庫
3. 問創世神

---

**建立時間**：2026-03-14  
**最後更新**：2026-03-14  
**版本**：1.0  
**狀態**：✅ 完整（100%）
