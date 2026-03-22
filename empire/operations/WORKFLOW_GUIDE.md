# 🔄 帝國工作流程指南

**更新**：2026-03-15  
**用途**：William 如何高效指揮公民

---

## 🎯 新的工作流程（自助式）

### 以前（需要重複解釋）

```
William: "Matthew，修復付款 webhook 的安全漏洞"
Matthew: "在哪裡？"
William: "在 src/app/api/linkpay/webhook/route.ts"
Matthew: "要怎麼修？"
William: "加簽章驗證，檢查 X-Signature header..."
Matthew: "驗證邏輯怎麼寫？"
William: "用 crypto.createHmac..."

（來回 5-10 次）
```

---

### 現在（一句話搞定）

```
William: "Matthew，修復付款 webhook 安全漏洞（P0，見作戰指揮室）"

Matthew 自己做：
  1. 讀 ~/Projects/venturo-erp/empire/operations/EMPIRE_COMMAND_CENTER.md
  2. 搜尋「付款 webhook」
  3. 看到：
     - 位置：src/app/api/linkpay/webhook/route.ts
     - 問題：無簽章驗證
     - 修復方案：（程式碼範例都有）
  4. 執行修復
  5. 回報：「✅ 已修復，加入簽章驗證」

（只需 1 次溝通）
```

---

## 📋 指令範本

### 安全修復

```
William → Matthew:
"修復 37 個未保護 API（見 operations/SECURITY_AUDIT_FULL.md）
優先級：P0（今天完成）"

Matthew 自己查清單，逐一修復，回報進度。
```

---

### 效能優化

```
William → Matthew:
"修復 N+1 查詢效能問題（見 operations/EMPIRE_COMPLETE_SCAN.md）
先修復前 20 個最嚴重的"

Matthew 自己找位置，改程式碼，測試效能。
```

---

### 功能開發

```
William → Caesar:
"設計報價確認流程的 UI（參考 operations/EMPIRE_COMMAND_CENTER.md
的報價確認 API 清單）"

Caesar 讀地圖 → 知道有 5 個 API → 設計對應 UI。
```

---

## 🗺️ 公民如何使用作戰地圖

### Matthew（IT Lead）

**常用查找**：

- 「某個功能在哪裡？」→ 程式碼地圖
- 「有哪些安全漏洞？」→ 安全審計
- 「哪些檔案太大需要重構？」→ 完整掃描

**查找方式**：

```bash
cd ~/Projects/venturo-erp/empire/operations
grep "付款功能" EMPIRE_COMMAND_CENTER.md
```

---

### Caesar（產品經理）

**常用查找**：

- 「現有 API 有哪些？」→ API 地圖
- 「資料庫有哪些表？」→ 資料庫索引
- 「報價流程怎麼運作？」→ 資料流地圖

---

### IT-Security（安全工程師）

**常用查找**：

- 「有哪些安全漏洞？」→ 安全審計完整版
- 「RLS 政策狀態？」→ 資料庫索引
- 「未保護的 API？」→ 37 個清單

---

## 🚀 William 的角色轉變

### 以前：手把手教學

- 每個任務都要解釋位置
- 每個修復都要說明細節
- 重複解釋相同的東西

**時間成本**：高

---

### 現在：下達指令即可

- 指定任務 + 指向文檔
- 公民自己查地圖
- 自主執行

**時間成本**：低

---

## 📊 效率對比

| 任務類型              | 以前       | 現在       | 節省 |
| --------------------- | ---------- | ---------- | ---- |
| 安全修復（37 個 API） | 37 次溝通  | 1 次溝通   | 97%  |
| 功能定位              | 每次都要說 | 自己查地圖 | 100% |
| 架構理解              | 重複解釋   | 讀文檔     | 90%  |

---

## 🎯 最佳實踐

### William 發指令時

**✅ 好的指令**：

```
"Matthew，修復 SQL Injection 漏洞（P0）
見 operations/EMPIRE_COMMAND_CENTER.md，搜尋『SQL 注入』
4 個位置都要修，今天完成"
```

**❌ 不好的指令**：

```
"Matthew，修復 SQL Injection"
（沒指向文檔，Matthew 還是要問在哪裡）
```

---

### 公民回報時

**✅ 好的回報**：

```
Matthew: "✅ 已修復 4 個 SQL Injection 漏洞
- useMentionSearch.ts:80 ✅
- LeaderMeetingSection.tsx:87 ✅
- customers.ts:66 ✅
- create-store.ts:198 ✅
測試通過，已 commit"
```

---

## 🔄 文檔更新流程

1. **William 做新的審計**
   - 掃描程式碼
   - 產生新報告

2. **更新作戰地圖**
   - 更新 workspace-william 的版本
   - 複製到 empire/operations/

3. **通知相關公民**
   - 發 Telegram：「作戰地圖已更新」
   - 或公民自動發現（每次任務前先讀最新版）

---

## 📚 推薦閱讀順序（新公民）

1. **README.md** — 理解作戰指揮室
2. **QUICK_REFERENCE.md** — 學會快速查找
3. **EMPIRE_COMMAND_CENTER.md** — 深入學習地圖
4. **WORKFLOW_GUIDE.md** — 本檔案

---

**維護者**：William 🔱  
**更新頻率**：每次重大審計後  
**所有公民**：隨時可讀
