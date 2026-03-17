# LINE 保險自動歸檔 - 快速開始

**現在就能用！** 🎉

---

## ✅ 現狀（2026-03-18）

**已完成**：
- ✅ Webhook 整合（自動觸發）
- ✅ 發送者過濾機制
- ✅ 團號自動解析
- ✅ PDF 下載+歸檔
- ✅ Telegram 通知

**待設定**：
- 🔜 保險公司 userId（目前：允許所有人）

---

## 🚀 運作方式

```
保險公司在 LINE 群組傳 PDF
  ↓
檔名是團號？（TW260321A.pdf）
  ↓
團號存在於 ERP？
  ↓
✅ 自動歸檔到團詳細頁 → 檔案 → 🛡️ 保險
  ↓
Telegram 通知你
```

---

## 📝 檔名規範（重要！）

**正確**：
```
TW260321A.pdf               ✅
TC260322B 保險單.pdf         ✅
TW260323C-0115BL008290.pdf  ✅
```

**錯誤**：
```
保險單.pdf                  ❌ 缺團號
TW2603.pdf                  ❌ 團號格式錯
2026-03-21 保險.pdf         ❌ 日期格式
```

**規則**：
- **台北**：`TW` + 6位數字 + 1位英文
- **台中**：`TC` + 6位數字 + 1位英文
- 後綴可以有（保險單、保單號等）

---

## 🔧 設定保險公司 userId（可選）

### 為什麼要設定？

**目前**：允許群組內所有人傳的 PDF（測試階段）
**未來**：只允許保險公司傳的 PDF（安全）

### 設定步驟

#### 1. 保險公司發一則訊息

請保險公司在 LINE 群組發**任何訊息**（不一定是檔案）

#### 2. 查看 Vercel logs

```
Vercel Dashboard → Functions → line/webhook
→ 找到最新的 log
→ 搜尋 "userId"
```

會看到：
```json
{
  "source": {
    "userId": "U1234567890abcdef",  // ← 這個
    "groupId": "C03f53517dc822913b394411981a100bf"
  }
}
```

#### 3. 加入可信任清單

編輯：`src/app/api/line/insurance-auto-save/route.ts`

```typescript
const TRUSTED_SENDERS = [
  'U1234567890abcdef',  // 喜多里保代
]
```

#### 4. 部署

```bash
git add -A
git commit -m "feat: 設定保險公司 userId"
git push
```

---

## 🧪 測試

### 方法 1：等真實檔案

保險公司下次傳 PDF 時自動觸發

### 方法 2：手動測試（不建議）

如果想立即測試，可以自己在群組傳 `TW260321A.pdf`（存在的團號）

---

## 📊 查看結果

### 成功

**Telegram 通知**：
```
✅ 保險 PDF 已自動歸檔

團號：TW260321A
檔案：TW260321A.pdf
大小：200 KB

📁 查看：團詳細頁 → 檔案 → 🛡️ 保險
```

**ERP 查看**：
```
團詳細頁 → 檔案 tab → 🛡️ 保險 → 看到新 PDF
```

### 失敗

**情況 1：無法解析團號**

```
❌ 保險 PDF 無法歸檔

檔案：保險單.pdf
原因：無法解析團號

💡 請確認檔名格式：TW260321A.pdf 或 TC260321A.pdf
```

**情況 2：團號不存在**

```
❌ 保險 PDF 無法歸檔

檔案：TW999999Z.pdf
團號：TW999999Z
原因：找不到團號 TW999999Z

💡 可能原因：
1. 團尚未建立
2. 團號輸入錯誤
```

---

## 🚨 異常處理

### 保險公司傳錯檔案

**問題**：檔名不是團號

**處理**：
1. 收到 Telegram 通知
2. 詢問保險公司正確團號
3. 手動歸檔：
```bash
node scripts/manual-insurance-save.cjs <messageId> "TW260321A"
```

### 團尚未建立

**問題**：ERP 還沒建這個團

**處理**：
1. 先建團
2. 再請保險公司重傳檔案
3. 或手動歸檔

---

## ✅ 檢查清單

- [ ] LINE Bot 已加入保險群組
- [ ] Webhook URL 設定：`https://app.cornertravel.com.tw/api/line/webhook`
- [ ] Webhook Verify 成功
- [ ] 告知保險公司檔名規範（TW260321A.pdf）
- [ ] 測試一次（自己或保險公司）
- [ ] 收到 Telegram 通知
- [ ] ERP 檔案 tab 看到 PDF

---

## 🔗 相關文件

- **完整設定**：`docs/line-insurance-setup.md`
- **流量說明**：`docs/supabase-storage-limits.md`
- **手動歸檔**：`scripts/manual-insurance-save.cjs`

---

**設定完成！保險 PDF 會自動歸檔 🎉**
