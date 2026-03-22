# 登入公司代號 Bug 修復

**日期**：2026-03-10  
**修復者**：馬修 🔧  
**Commit**：d4c0ff9e

---

## 🐛 **Bug 描述**

### 症狀

- 會計昨天無法登入
- SUCCESS、TEST 測試租戶登入失敗
- William（已登入有快取）正常使用

### 根本原因

**登入頁面 Line 88 將公司代號轉成小寫**：

```typescript
// ❌ 錯誤
const trimmedCode = code.trim().toLowerCase()
```

但資料庫中公司代號為**大寫** (CORNER, SUCCESS, TEST)，導致查詢失敗：

```sql
SELECT * FROM workspaces WHERE code = 'corner'  -- ❌ 找不到
SELECT * FROM workspaces WHERE code = 'CORNER'  -- ✅ 正確
```

---

## 🔍 **為什麼 William 不受影響**

### 有快取的用戶（William）

- ✅ 瀏覽器記住登入 session
- ✅ 不需要重新執行登入邏輯
- ✅ 即使有 bug 也能繼續使用

### 沒有快取的用戶（會計、新用戶）

- ❌ 必須重新登入
- ❌ 觸發 `.toLowerCase()` bug
- ❌ 公司代號被轉成小寫
- ❌ 資料庫找不到 → 登入失敗

**這是典型的「有快取的用戶正常，新用戶失敗」bug 模式。**

---

## ✅ **修復方式**

### Code 變更

```diff
- const trimmedCode = code.trim().toLowerCase()
+ const trimmedCode = code.trim().toUpperCase()
```

### 檔案

- `src/app/(main)/login/page.tsx` Line 88

### 驗證

```bash
# 測試 API 直接呼叫
curl -X POST http://localhost:3000/api/auth/validate-login \
  -H "Content-Type: application/json" \
  -d '{"username":"E001","password":"00000000","code":"CORNER"}'

# Response: {"success":true,...} ✅
```

---

## 📊 **影響範圍**

### 修復前（受影響）

- ❌ **所有新登入的使用者**
- ❌ **清除快取後重新登入**
- ❌ **任何新建立的測試帳號**（SUCCESS、TEST）

### 修復後

- ✅ **所有用戶都能正常登入**
- ✅ **新租戶可以立即使用**

---

## 🎓 **教訓**

### 1. 測試要涵蓋「無快取」場景

- 開發者有快取 → 測試都正常
- 真實新用戶登入 → 才會遇到 bug
- **解決方案**：測試時清除快取或用無痕模式

### 2. 大小寫一致性很重要

- 資料庫用大寫 → 前端也要用大寫
- 統一在一個地方處理（API 統一大寫）
- 避免分散在前端和後端各自處理

### 3. 快取問題很隱蔽

- 有快取 = 正常
- 無快取 = 失敗
- 這類 bug 很難被開發者發現

---

## 🔄 **相關修復**

### 同時發現的問題

1. **租戶建立時沒有設定 permissions**
   - 已修復：`src/app/api/tenants/create/route.ts`
   - SUCCESS 公司權限已手動修復

2. **測試工具問題**
   - Browser automation 無法正確切換租戶 session
   - 需要用全新 tab 才能測試不同租戶

---

## ✅ **驗證完成**

### 測試場景

1. ✅ CORNER 公司登入成功（William 帳號）
2. ✅ SUCCESS 公司登入成功（修復權限後）
3. ✅ TEST 公司登入成功（新建租戶）
4. ✅ API 直接呼叫測試通過

### 確認修復

- ✅ 會計現在可以登入
- ✅ 新用戶不會再遇到登入失敗
- ✅ 測試租戶正常運作

---

_修復者：馬修 🔧_  
_時間：2026-03-10 08:48_  
_Commit：d4c0ff9e_
