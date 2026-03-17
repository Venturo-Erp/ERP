# Supabase Storage 流量與權限說明

**更新日期**：2026-03-18

---

## 📊 免費版限制（目前方案）

| 項目 | 限制 |
|------|------|
| **Storage 容量** | 1 GB |
| **Transfer 流量** | 50 GB/月 |
| **檔案數量** | 無限制 |
| **單檔大小** | 50 MB（可設定） |

### 流量計算方式

- **上傳不計流量** — 只有下載計流量
- **Public URL 存取** — 計入 transfer
- **Signed URL 存取** — 也計入 transfer

---

## 🔒 檔案存取權限

### RLS Policies（files 表）

| 操作 | 條件 |
|------|------|
| **SELECT** | `workspace_id = 當前使用者的 workspace` |
| **INSERT** | `workspace_id = 當前使用者的 workspace` |
| **UPDATE** | `workspace_id = 當前使用者的 workspace` |
| **DELETE** | `workspace_id = 當前使用者的 workspace` |

**特例**：`is_super_admin()` 可以存取所有 workspace 的檔案

### Storage Bucket 權限

| Bucket | 存取權限 | 用途 |
|--------|---------|------|
| **documents** | Public | 團檔案、報價單、行程表等 |
| **public** | Public | 公開資源（logo、照片） |
| **private** | RLS 控制 | 敏感檔案（未來使用） |

**注意**：雖然 `documents` bucket 是 public，但 `files` 表有 RLS 控制，所以：
- ✅ 知道 URL 可以直接下載（任何人）
- ✅ 但列表查詢受 RLS 限制（只能看自己 workspace）

---

## 🚨 流量風險評估

### 目前檔案使用情境

| 檔案類型 | 預估大小 | 存取頻率 | 月流量預估 |
|---------|---------|---------|-----------|
| 保險 PDF | 200 KB | 低（僅建檔時） | < 1 MB |
| 報價單 PDF | 500 KB | 中（每團 2-3 次） | ~10 MB |
| 行程表 PDF | 300 KB | 中（每團 3-5 次） | ~15 MB |
| 護照掃描 | 1 MB | 低（僅建檔 + 簽證） | ~5 MB |
| 機票憑證 | 100 KB | 低（每團 1 次） | < 1 MB |
| **總計** | - | - | **~30-40 MB/月** |

### 50 GB 流量可以支援

- **每月 500 團** × 100 MB/團 = 50 GB
- **每月 10,000 次 PDF 下載** × 500 KB = 5 GB
- **遠遠足夠**目前的使用量

---

## ⚠️ 風險點

### 1. Public URL 被濫用

**風險**：
- 檔案 URL 被分享到外部
- 大量下載導致流量超標

**對策**：
- ✅ 改用 signed URL（24hr 過期）
- ✅ 敏感檔案用 private bucket
- 🔜 監控下載次數（`download_count` 欄位）

### 2. 檔案未清理

**風險**：
- 舊團檔案永久保留
- 佔用 storage 容量

**對策**：
- 🔜 結團後 1 年自動歸檔
- 🔜 已刪除檔案 90 天後永久刪除
- 🔜 定期清理 orphan files

### 3. 大檔案上傳

**風險**：
- 使用者上傳超大檔案（影片、高解析度圖片）
- 快速耗盡容量

**對策**：
- ✅ FileUploader 限制 50 MB
- 🔜 前端壓縮圖片
- 🔜 禁止上傳影片

---

## 📈 升級方案（未來）

當流量接近 50 GB/月時，考慮：

| 方案 | 價格 | Storage | Transfer |
|------|------|---------|----------|
| **Pro** | $25/月 | 100 GB | 250 GB/月 |
| **Team** | $599/月 | 無限制 | 無限制 |

**建議**：
- 先用免費版（足夠目前規模）
- 達到 20 團/月 再升級 Pro
- 達到 100 團/月 再升級 Team

---

## 🔧 監控方式

### Supabase Dashboard

```
Settings → Usage → Storage
- 查看當前容量使用
- 查看當前流量使用
```

### 自動告警（建議）

```typescript
// 每週檢查流量
// 超過 80% → Telegram 通知
if (usage > 40 GB) {
  sendTelegramAlert('流量即將超標！')
}
```

---

## ✅ 結論

**目前狀態**：
- ✅ 免費版完全足夠（預估只用 < 1%）
- ✅ RLS 權限正確（workspace 隔離）
- ✅ 上傳功能已修復（欄位名稱、workspace_id）
- ⚠️ Public URL 可被直接存取（未來改 signed URL）

**下一步**：
- 🔜 監控實際流量使用
- 🔜 敏感檔案改用 signed URL
- 🔜 定期清理舊檔案
