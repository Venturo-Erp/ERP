# 🎯 快速參考卡

**用途**：1 分鐘找到任何東西

---

## 🚨 緊急情況

| 問題                | 立刻查                   | 檔案                    |
| ------------------- | ------------------------ | ----------------------- |
| 付款 webhook 被攻擊 | EMPIRE_COMMAND_CENTER.md | 搜尋「付款 webhook」    |
| SQL 注入攻擊        | EMPIRE_COMMAND_CENTER.md | 搜尋「SQL 注入」        |
| API 被濫用          | SECURITY_AUDIT_FULL.md   | 第 37 個未保護 API 清單 |
| 效能爆炸            | EMPIRE_COMPLETE_SCAN.md  | 搜尋「N+1 查詢」        |

---

## 💻 開發任務

| 任務         | 查什麼        | 在哪裡                           |
| ------------ | ------------- | -------------------------------- |
| 修改報價計算 | 報價計算邏輯  | `quote.service.ts:119`           |
| 修改付款流程 | 付款計算邏輯  | `payment-request.service.ts:373` |
| 修改認證     | 認證核心      | `src/lib/auth.ts`                |
| 加 API 認證  | withAuth 中介 | `src/lib/api/with-auth.ts`       |

---

## 🗄️ 資料庫

| 需求       | 查什麼       | 位置                     |
| ---------- | ------------ | ------------------------ |
| 核心資料表 | 9 核心表清單 | EMPIRE_COMMAND_CENTER.md |
| RLS 政策   | RLS 檢查 SQL | EMPIRE_COMMAND_CENTER.md |
| 資料表關係 | 關係圖       | EMPIRE_COMPLETE_SCAN.md  |

---

## 🔍 一秒掃描指令

**找未保護 API**：

```bash
grep -A 50 "未保護 API 完整清單" empire/operations/EMPIRE_COMMAND_CENTER.md
```

**找 SQL Injection**：

```bash
grep -A 10 "SQL 注入" empire/operations/EMPIRE_COMMAND_CENTER.md
```

**找環境變數**：

```bash
grep -A 30 "環境變數索引" empire/operations/EMPIRE_COMMAND_CENTER.md
```

---

**更新**：2026-03-15  
**維護者**：William 🔱
