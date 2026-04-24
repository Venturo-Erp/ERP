# Blueprint · `/tools/*` 小工具頁

> **版本**: v1.0 · 2026-04-18（cron auto-gen）
> **狀態**: 🟡 骨架、1 條 🔴 P0 資安缺陷
> **Audit**: `VENTURO_ROUTE_AUDIT/03-tools.md`
> **子路由**: `/tools/flight-itinerary` · `/tools/hotel-voucher` · `/tools/reset-db`

---

## 1. 存在理由（Purpose）

**一句話**：3 個小工具—— 把 Trip.com 機票/飯店憑證轉成 Corner 風格、以及開發用清本機 indexedDB。

### 服務對象

- **flight-itinerary / hotel-voucher**：業務助理（為客戶重新排版憑證）
- **reset-db**：開發用（目前任何登入者可用 🔴）

### 解決什麼

- ✅ Trip.com PDF 醜 → Corner 品牌風格行程單
- ✅ dev 本機 IndexedDB 清理

### **不**解決

- ❌ 實際從 PDF 自動解析（目前是**手動輸入 / sample data 預覽**）
- ❌ 多供應商（目前只支援 Trip.com 格式）

---

## 2. 業務流程（Workflow）

### flight-itinerary / hotel-voucher

```
[業務手動輸入 / 貼 sample data] → <CornerXxx /> render → 預覽 Dialog → 列印 / PDF
```

📋 **待 William 確認**：

- 業務實際怎麼用？手動打字輸入所有航班資料？還是貼 PDF 文字？有沒有解析 PDF 的 library？
- 每月使用頻率？（audit 疑為半成品、未確認是否已上線）

### reset-db

```
[系統主管 打開頁] → [按 Reset] → [二次確認] → 刪 VenturoOfflineDB + venturo-db → 重新載入
```

🔴 **目前無 系統主管 檢查、無二次確認**

---

## 3. 資料契約（Data Contract）

### 讀取

- **flight/hotel**: `useWorkspaceSettings`（logo、公司名、地址）
- **reset-db**: 無

### 寫入

- **flight/hotel**: 無（純客戶端列印）
- **reset-db**: 刪 browser indexedDB（**不動 Supabase**）

### Source of Truth

- `flight.SAMPLE_DATA_1/2` / `hotel.SAMPLE_DATA_1/2` — **hardcoded in code**（上線前該清掉、audit 已標）
- 🛑 **不動 Supabase**（此頁不碰、紅線守）

---

## 4. 權限矩陣

| 子頁                    | 系統主管 | 業務                  | 會計                  |
| ----------------------- | -------- | --------------------- | --------------------- |
| /tools/flight-itinerary | ✅       | ✅                    | ❌ ✅ 決定 2026-04-18 |
| /tools/hotel-voucher    | ✅       | ✅                    | ❌ ✅ 決定 2026-04-18 |
| /tools/reset-db         | ✅       | 🔴 **目前開放、應關** | ❌                    |

**✅ 決定 2026-04-18**：會計不需要 voucher 工具（William 確認「會計不會用、業務才會用」）

引用 INVARIANT：

- **INV-A02 Settings/開發工具必系統主管** — reset-db 違反、下輪 Stage C 自動補
- **INV-A03 RLS 不當唯一防線** — tools 無 RLS 可靠、全靠 route guard

📋 **待 William 確認**：會計該不該看 voucher 工具？

---

## 5. 依賴圖

### 上游

- Sidebar menu（若有列「工具」選單）
- 直接輸入 URL

### 下游

- 列印 Dialog（不跳頁）
- reset-db 成功後 reload browser

### Component Tree

```
/tools/flight-itinerary/page.tsx
└── <CornerFlightItinerary />（features/itinerary/components/）
    └── useWorkspaceSettings

/tools/hotel-voucher/page.tsx
└── <CornerHotelVoucher />（features/accommodation/components/）
    └── useWorkspaceSettings

/tools/reset-db/page.tsx
└── 純 indexedDB 操作、無外部依賴
```

---

## 6. 設計決策（ADR）

### ADR-T1 · reset-db 目前無 系統主管 guard（🔴 P0）

**違反 INVARIANT**：**INV-A02 Settings/開發工具必系統主管**
**原因**：歷史、當時可能開發用沒想到正式環境會被普通用戶看到
**動作**：下輪 Stage C 補 `isAdmin` guard（🟢、不動 DB、不需業務決策）
**建議配套**（可選）：

- 二次確認（輸入「DELETE」才能執行）
- 只在 `NODE_ENV === 'development'` 顯示整個頁
- 移到 `/settings/dev-tools/reset-db`（系統主管設定區）

### ADR-T2 · flight/hotel 結構 99% 相同、可抽 template

**現狀**：兩個 page.tsx + 兩個 Corner\*Component 各自獨立、但 pattern 完全一樣（useState / Dialog / Print / sample data）
**選項**：

- A：保留現狀（獨立演進、不抽象）
- B：抽 `<VoucherConverterTemplate template={...} sampleData={...} />` 共用
  **📋 暫定 A**：兩個工具今天能用、抽 template 是 premature optimization、等第三種憑證出現（車票 / 門票）再抽。

### ADR-T3 · SAMPLE_DATA 硬編在 code

**現狀**：flight 1 組、hotel 2 組 sample data 寫死在 page.tsx 裡（100+ 行）
**✅ 決定 (2026-04-18)**：**flight/hotel 是半成品**（William 確認）

- 目前只有 sample 預覽、沒有真輸入機制
- SAMPLE_DATA 移到 dev mode / Storybook、不讓正式上線看到
- 下輪 Stage C 執行：
  1. 把 SAMPLE_DATA 抽到 `__fixtures__/` 目錄或 dev-only 檔
  2. page 預設顯示「此工具尚未完成、輸入機制開發中」占位訊息（或直接隱藏）
  3. 加 `NODE_ENV === 'development'` 條件載 sample
- 📋 第二輪另決定：PDF 自動解析 vs 手動輸入表單（工程 scope 大、業務決策 + 技術選 library）

---

## 7. 反模式 / 紅線

### ❌ 不要在 /tools 做 DB 寫入

**規則**：tools 頁純 utility、若需寫 DB → 應該移到對應 feature 頁（如 `/finance/*` 或 `/tours/*`）
**原因**：權限邊界混亂、tools 假設是輕量

### ❌ 不要擴展 reset-db 去清 Supabase 資料

**紅線**：即使未來加「重置測試資料」功能、**絕不**碰 production Supabase

### ❌ SAMPLE_DATA 不可出 dev

**規則**：正式上線前必清 SAMPLE_DATA_1/2、或移到 dev-only loader

---

## 8. 擴展點

### ✅ 安全擴展

1. **新增 voucher 類型**（車票、保險憑證、簽證憑證）→ 仿 flight/hotel pattern
2. **多語言憑證**（英文、日文客戶）→ i18n 擴展既有 LABELS

### 🔴 需小心

3. **真實 PDF 解析整合** → 大改、需選 PDF parser lib（pdfjs / pdf-parse）、加 API route、不在 tools scope
4. **reset-db 擴展 server-side**（清 Supabase test data）→ **紅線禁止**、絕不實作

### ❌ 不該做

- **在 tools 放 production 業務邏輯**
- **把 reset-db 連上 server API**（安全災難）

---

## 9. 技術債快照

| #   | 問題                                             | 違反 INV | 層級                                       |
| --- | ------------------------------------------------ | -------- | ------------------------------------------ |
| 1   | `/tools/reset-db` 無 系統主管 guard              | INV-A02  | 🔴 P0、🟢 下輪 Stage C 可自動修            |
| 2   | reset-db 無二次確認                              | —        | 🟡 UX                                      |
| 3   | SAMPLE_DATA_1/2 硬編（flight 1 組 + hotel 2 組） | —        | 📋 業務確認是否半成品                      |
| 4   | flight/hotel 99% 結構重複                        | —        | 🟡 第二輪可抽 template                     |
| 5   | 無輸入表單（或半成品）                           | —        | 📋 業務確認使用方式                        |
| 6   | logger 在 production 可能洩 DB 名字              | —        | 🟡 檢查 logger 是否自動屏蔽                |
| 7   | 3 頁 page.tsx 都直接寫邏輯（不薄殼）             | INV-P01  | 🟡 flight/hotel 合理、reset-db 50 行可接受 |

---

## 10. 修復計畫

### Step 1 · 業務訪談（William）

- flight/hotel 目前是半成品還是已用？
- 業務怎麼用？有沒有從 PDF 解析？
- 會計該不該進？

### Step 2 · 下輪 Stage C（🟢 可自動）

- #1 **reset-db 加 `isAdmin` guard**（3 行 code、沒有系統主管資格 redirect `/unauthorized`）
- #2 reset-db 加二次確認（輸入「DELETE」才執行）

### Step 3 · 業務確認後再做

- #3 若是半成品 → 移 SAMPLE_DATA 到 dev loader 或 Storybook
- #5 若需要真輸入表單 → 設計 form

### Step 4 · 第二輪

- #4 抽 `<VoucherConverterTemplate>` 共用（待第三種憑證）

---

## 11. 相關連結

- **Audit**: `VENTURO_ROUTE_AUDIT/03-tools.md`
- **flight**: `src/app/(main)/tools/flight-itinerary/page.tsx` + `src/features/itinerary/components/CornerFlightItinerary.tsx`
- **hotel**: `src/app/(main)/tools/hotel-voucher/page.tsx` + `src/features/accommodation/components/CornerHotelVoucher.tsx`
- **reset-db**: `src/app/(main)/tools/reset-db/page.tsx`
- **Shared hook**: `src/hooks/useWorkspaceSettings.ts`

---

## 變更歷史

- 2026-04-18 v1.0：cron auto-gen、1 🔴 P0（reset-db 系統主管 guard）+ 3 📋（業務使用模式確認）
