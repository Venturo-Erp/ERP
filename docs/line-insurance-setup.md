# LINE 保險自動歸檔設定

**更新日期**：2026-03-18

---

## 📋 運作流程

```
保險公司傳 PDF 到 LINE 群組
↓
Webhook 收到事件
↓
【檢查 1】是保險公司傳的嗎？
  ❌ 不是 → 略過（記錄 log）
  ✅ 是 → 繼續
↓
【檢查 2】檔名是否為團號？
  ❌ 不是 → 通知 William（無法歸檔）
  ✅ 是 → 繼續
↓
【檢查 3】團號存在於 ERP 嗎？
  ❌ 不存在 → 通知 William（團尚未建立）
  ✅ 存在 → 繼續
↓
下載 PDF → 上傳 Supabase → 建立 files 記錄
↓
✅ 完成（Telegram 通知）
```

---

## 🔑 設定可信任發送者

### 方法 1：用 LINE userId（推薦）

**優點**：最可靠，不會因改名而失效

**步驟**：
1. 保險公司在群組發一則訊息
2. 查看 webhook log 取得 `userId`
3. 加到 `TRUSTED_SENDERS` 清單

```javascript
// scripts/line-insurance-filter.cjs
const TRUSTED_SENDERS = [
  'U1234567890abcdef',  // 喜多里保代的 userId
  'Uabcdef1234567890',  // 其他保險公司
]
```

### 方法 2：用 displayName（簡單但不可靠）

**優點**：設定簡單  
**缺點**：對方改名就失效

```javascript
const TRUSTED_SENDERS = [
  '喜多里保代',
  '喜多里',
  '保險公司',
]
```

---

## 📝 檔名規範

**正確格式**：
```
TW260321A.pdf             ✅ 台北角落
TC260322B 保險單.pdf       ✅ 台中角落
TW260323C-保險.pdf        ✅ 可以有後綴
```

**錯誤格式**：
```
保險單.pdf                ❌ 缺團號
TW2603.pdf                ❌ 團號格式錯
2026-03-21 保險.pdf       ❌ 日期格式
```

**團號格式規則**：
- 台北：`TW` + 6位數字 + 1位英文（例：TW260321A）
- 台中：`TC` + 6位數字 + 1位英文（例：TC260321A）

---

## 🚨 異常處理

### 情況 1：非保險公司傳的檔案

**處理**：略過 + 記錄 log

```
⚠️  略過: 某檔案.pdf - 非保險公司發送 (William Chien)
```

**不會**：
- ❌ 不會下載
- ❌ 不會歸檔
- ❌ 不會通知（太吵）

### 情況 2：無法解析團號

**處理**：Telegram 通知 William

```
❌ 保險 PDF 無法歸檔

檔案：保險單-0115BL008290.pdf
發送者：喜多里保代
原因：無法從檔名解析團號

請手動處理：
node scripts/manual-insurance-save.cjs <messageId> "TW260321A"
```

### 情況 3：團號不存在

**處理**：Telegram 通知 William

```
❌ 保險 PDF 無法歸檔

檔案：TW999999Z.pdf
發送者：喜多里保代
原因：ERP 中找不到團號 TW999999Z

可能原因：
1. 團尚未建立
2. 團號輸入錯誤

請確認後手動處理。
```

---

## 🔧 手動歸檔（備用方案）

如果自動歸檔失敗，可以手動執行：

```bash
cd ~/Projects/venturo-erp

# 方法 1：用腳本（需要 messageId）
node scripts/manual-insurance-save.cjs <messageId> "TW260321A 保險單.pdf"

# 方法 2：直接上傳到團詳細頁
# 團詳細頁 → 檔案 tab → 🛡️ 保險 → 上傳檔案按鈕
```

---

## 📊 歸檔位置

**Supabase Storage 路徑**：
```
documents/tour-documents/{團號}/insurance/{timestamp}_{檔名}
```

**範例**：
```
documents/tour-documents/TW260321A/insurance/1773756000551_TW260321A.pdf
```

**ERP 查看位置**：
```
團詳細頁 → 檔案 tab → 🛡️ 保險
```

---

## 🔍 查詢保險公司的 userId

### 步驟 1：等待保險公司發訊息

在 LINE 群組等待保險公司發任何訊息（不一定是檔案）

### 步驟 2：查看 webhook log

```bash
# 查看 Vercel function logs
# 或在本機測試時
grep "userId" /tmp/line-webhook.log
```

### 步驟 3：記錄 userId

```json
{
  "source": {
    "userId": "U1234567890abcdef",  // ← 這個
    "type": "user"
  }
}
```

### 步驟 4：加入可信任清單

```javascript
const TRUSTED_SENDERS = [
  'U1234567890abcdef',  // 喜多里保代
]
```

---

## ✅ 測試檢查清單

- [ ] 保險公司 userId 已加入 TRUSTED_SENDERS
- [ ] 測試檔案：TW260321A.pdf（存在的團）
- [ ] Webhook 接收正常
- [ ] 發送者檢查通過
- [ ] 團號解析正確
- [ ] PDF 下載成功
- [ ] Supabase 上傳成功
- [ ] files 記錄建立成功
- [ ] ERP 檔案 tab 可見
- [ ] Telegram 通知正常

---

## 🔐 安全性

### 為什麼要檢查發送者？

1. **防止誤歸檔**：群組其他人傳的檔案不會被當成保險單
2. **防止惡意上傳**：外人無法透過 LINE 群組塞檔案到 ERP
3. **節省流量**：不下載無關檔案

### RLS 保護

即使檔案被誤上傳，RLS policy 也會保護：
- ✅ 只有同 workspace 的人能看到
- ✅ 其他公司看不到

---

**設定完成後，保險 PDF 會自動歸檔到正確的團體！** 🎉
