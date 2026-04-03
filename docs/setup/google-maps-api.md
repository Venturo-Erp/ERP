# Google Maps API 設定指南

## 快速開始

### 1. 取得 API Key

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 登入 Google 帳號
3. 點擊「選取專案」→「新增專案」
4. 輸入專案名稱（例如：`venturo-erp-maps`）
5. 點擊「建立」

### 2. 啟用 Places API

1. 在左側選單選擇「API 和服務」→「程式庫」
2. 搜尋「Places API」
3. 點擊「Places API」
4. 點擊「啟用」

### 3. 建立 API 憑證

1. 在左側選單選擇「API 和服務」→「憑證」
2. 點擊「建立憑證」→「API 金鑰」
3. 複製產生的 API Key
4. （建議）點擊「限制金鑰」設定使用限制

### 4. 設定環境變數

在專案根目錄的 `.env.local` 檔案中加入：

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=你的_API_金鑰
```

**範例：**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA5c-FpA8NtK-aDbWIaaWjCzfFwKq5dEZY
```

### 5. 重啟開發伺服器

```bash
npm run dev
```

## API 限制設定（建議）

為了安全起見，建議限制 API Key 的使用範圍：

### 應用程式限制

選擇「HTTP 參照網址 (網站)」：

```
http://localhost:1069/*
https://app.cornertravel.com.tw/*
```

### API 限制

只允許使用「Places API」：
- ✅ Places API
- ❌ 其他 API（取消勾選）

## 費用說明

Google Places API 採用用量計費：

### Text Search（文字搜尋）

- **每次搜尋**：$0.032 USD
- **免費額度**：每月 $200 USD（約 6,250 次搜尋）
- **預估使用量**：每天新增 10 個景點 × 30 天 = 300 次/月（遠低於免費額度）

**詳細定價**：[Google Maps Platform 定價](https://developers.google.com/maps/billing-and-pricing/pricing)

## 監控用量

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇「API 和服務」→「資訊主頁」
3. 查看「Places API」的使用量
4. 設定「配額」警示（避免超額）

## 常見問題

### Q1: API Key 無效？

**檢查清單：**
- ✅ 已啟用「Places API」
- ✅ API Key 已複製正確（無多餘空格）
- ✅ `.env.local` 檔案格式正確
- ✅ 已重啟開發伺服器

### Q2: 搜尋不到座標？

**可能原因：**
- 景點名稱太模糊（例如：「寺廟」）
- 城市/國家資訊不正確
- 景點名稱拼寫錯誤

**解決方法：**
- 使用更完整的名稱（例如：「素帖寺」→ `Wat Phra That Doi Suthep`）
- 使用英文名稱搜尋準確度更高
- 貼上 Google Maps 連結（備用方案）

### Q3: API 超額怎麼辦？

**解決方法：**
1. 檢查是否有異常大量請求
2. 實作快取機制（避免重複搜尋）
3. 考慮升級至付費方案
4. 限制每日/每月使用量

## 備用方案

如果不想使用 Google Maps API，可以：

1. **手動輸入座標**：直接在表單填入緯度/經度
2. **貼上 Google Maps URL**：系統會自動解析座標
3. **批次匯入**：準備好座標資料後批次匯入

## 相關文件

- [景點座標自動取得系統](../features/auto-coordinate-search.md)
- [Google Places API 官方文件](https://developers.google.com/maps/documentation/places/web-service/overview)
