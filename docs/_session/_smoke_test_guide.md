# 上線前 Smoke Test 指南
> 2026-05-02 / 5-10 分鐘走完、確認 ERP 真的上線級

---

## 為什麼要這份

技術指標（TS 0 錯、RLS 100% 覆蓋、模擬測試對角線完美）只是 lab 結果。
**上線級 = 用兩個真實用戶、真的點 UI、真的看到隔離**。

---

## 準備

開兩個瀏覽器視窗（或用無痕 + 一般、各自登入）：

| 視窗 | 帳號 | 角色 |
|---|---|---|
| **A** | William (CORNER 系統主管) | admin |
| **B** | 范竹 (YUFEN 助理) | staff |

---

## Test 1：跨租戶 sidebar 隔離（30 秒）

**A 視窗**：登入後看 sidebar 顯示什麼選單
**B 視窗**：登入後看 sidebar 顯示什麼選單

**期望**：
- A 看到所有 admin 功能（HR / 設定 / 租戶管理 等）
- B 看到的選單較少、不應該看到「租戶管理」

❌ **失敗訊號**：B 看到 admin 才有的選單 → 修

---

## Test 2：跨租戶 URL 直接跳（1 分鐘）

**A 視窗**：開一個 CORNER 的 tour、複製網址（例：`/tours/CNX250128A`）
**B 視窗**：把 A 的網址貼上去開

**期望**：
- B 應該看到 **404 或 Unauthorized**（YUFEN 用戶看不到 CORNER 的 tour）

❌ **失敗訊號**：B 看到 CORNER 的 tour 內容 → 跨租戶資料外洩、立即修

---

## Test 3：跨租戶 API 直接打（1 分鐘）

**B 視窗**（YUFEN 用戶）的 DevTools console：
```js
// 試 fetch CORNER 的 tour（拿一個 A 視窗看到的 tour ID）
fetch('/api/tours/by-code/<CORNER 的 tour_code>').then(r => r.json()).then(console.log)
```

**期望**：回 404 / 401 / 403

❌ **失敗訊號**：回實際資料 → API 沒守好

---

## Test 4：權限矩陣 UI（1 分鐘）

**A 視窗**：去 `/hr/roles`、看一個非 admin role（例：業務）的權限矩陣

**期望**：
- 矩陣顯示完整、勾選/取消勾都能存
- 存後該 role 的人登入、權限變化生效

❌ **失敗訊號**：矩陣空的 / 存不了 → role_capabilities API 接層有 bug

---

## Test 5：建單流程 workspace_id 自動帶（1 分鐘）

**A 視窗**：
1. 建一個新 tour
2. 看 DevTools Network 面板的 POST request
3. 確認 body 有 `workspace_id` 自動帶入（不必手動填）

**期望**：workspace_id 出現在 request body

❌ **失敗訊號**：workspace_id 沒帶 → entity hook 沒守好

---

## Test 6：金流 webhook 沒破（5 分鐘、難測但必要）

⚠️ **不要在 production 真的跑 LinkPay test**、看 code 確認：

```bash
grep -A5 "linkpay/webhook" src/app/api/linkpay/webhook/route.ts | head -20
```

**期望看到**：
- 先 select linkpay_logs 取 workspace_id
- 後續 update 用該 workspace_id 限定
- HMAC 簽名驗證仍在
- 成功路徑訊息不變

❌ **失敗訊號**：update 沒 workspace_id filter → 跨租戶寫入

---

## Test 7：守門 script 跑得起來（10 秒）

```bash
./scripts/check-standards.sh
```

**期望**：9 條全綠、`✅ 所有守門檢查通過`

❌ **失敗訊號**：任何 FAIL → 違反憲法、看哪條、修

---

## Test 8：pre-commit 真的擋（30 秒）

```bash
# 假裝寫個違反憲法的 code
echo "const isAdmin = useAuthStore(s => s.isAdmin)" >> src/test-violation.ts
git add src/test-violation.ts
git commit -m "test"
# 應該被擋、cancel 不要真的 commit
git restore --staged src/test-violation.ts
rm src/test-violation.ts
```

**期望**：commit 被 .husky/pre-commit 擋、看到「ERP standards violations found」

❌ **失敗訊號**：commit 過去了 → pre-commit hook 沒接好

---

## 全部過 = 上線級乾淨

跑完 Test 1-8 全綠：
- 你有把握 ERP 跨租戶資料隔離真的有用
- 守門機制真的能防退化
- 上線給角落 / 富順 / 勁揚用、安心

跑到一個失敗 = 退回對應 task、修完再重跑全 8 個。

---

## 如果發現 Test 失敗

每個 fail 記錄：
- Test 編號
- 期望 vs 實際
- 影響哪個業務流程

回報給我（下個 session 開始時讀這份檔）、我會接手修。
