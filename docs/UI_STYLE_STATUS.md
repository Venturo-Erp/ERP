# UI 風格現況總表

> **最後審計:** 2026-04-05 (`f3daacae`)
> **整體合規率:** ~92%（128 路由審計完成，116 violations in 13 public routes）
> **下次審計用法:** `git diff --name-only <基準commit> HEAD -- src/` 比對 E 區檔案清單，有差異的才需要重掃
> **元素總表:** [`docs/UI_ELEMENT_CATALOG.md`](./UI_ELEMENT_CATALOG.md)（按鈕/圖示/標籤清單，給設計師看）

---

## A. 已確認合規的路由（95%+）

| Route                            | 合規率      | 基準 commit | 檢查檔案                                               |
| -------------------------------- | ----------- | ----------- | ------------------------------------------------------ |
| `/accounting` (all sub-routes)   | ✅ 100%     | `f3daacae`  | src/app/(main)/accounting/\*_/_.tsx                    |
| `/brochure`                      | ✅ redirect | `f3daacae`  | —                                                      |
| `/brochures`                     | ✅ 100%     | `f3daacae`  | src/app/(main)/brochures/\*_/_.tsx                     |
| `/calendar`                      | ✅ 100%     | `f3daacae`  | src/app/(main)/calendar/\*_/_.tsx                      |
| `/channel`                       | ✅ 100%     | `f3daacae`  | src/app/(main)/channel/\*_/_.tsx                       |
| `/contracts`                     | ✅ 100%     | `f3daacae`  | src/app/(main)/contracts/\*_/_.tsx                     |
| `/customers` (all)               | ✅ 100%     | `f3daacae`  | src/app/(main)/customers/\*_/_.tsx                     |
| `/customer-groups`               | ✅ 100%     | `f3daacae`  | src/app/(main)/customer-groups/\*_/_.tsx               |
| `/customized-tours`              | ✅ 100%     | `f3daacae`  | src/app/(main)/customized-tours/page.tsx               |
| `/customized-tours/[id]`         | ✅ 100%     | `f3daacae`  | src/app/(main)/customized-tours/[id]/page.tsx          |
| `/database`                      | ✅ 100%     | `f3daacae`  | src/app/(main)/database/page.tsx                       |
| `/database/archive-management`   | ✅ 100%     | `f3daacae`  | src/app/(main)/database/archive-management/page.tsx    |
| `/database/attractions`          | ✅ 100%     | `f3daacae`  | src/app/(main)/database/attractions/\*_/_.tsx          |
| `/database/company-assets`       | ✅ 100%     | `f3daacae`  | src/app/(main)/database/company-assets/\*_/_.tsx       |
| `/database/fleet`                | ✅ 100%     | `f3daacae`  | src/app/(main)/database/fleet/\*_/_.tsx                |
| `/database/suppliers`            | ✅ 100%     | `f3daacae`  | src/app/(main)/database/suppliers/\*_/_.tsx            |
| `/database/tour-leaders`         | ✅ 100%     | `f3daacae`  | src/app/(main)/database/tour-leaders/\*_/_.tsx         |
| `/database/transportation-rates` | ✅ 100%     | `f3daacae`  | src/app/(main)/database/transportation-rates/\*_/_.tsx |
| `/database/workspaces`           | ✅ 100%     | `f3daacae`  | src/app/(main)/database/workspaces/\*_/_.tsx           |
| `/design`                        | ✅ redirect | `f3daacae`  | —                                                      |
| `/hr` (all sub-routes)           | ✅ 98%      | `f3daacae`  | src/app/(main)/hr/\*_/_.tsx                            |
| `/inquiries`                     | ✅ 100%     | `f3daacae`  | src/app/(main)/inquiries/page.tsx                      |
| `/itinerary` (all)               | ✅ 97%      | `f3daacae`  | src/app/(main)/itinerary/\*_/_.tsx                     |
| `/local` (all)                   | ✅ 95%      | `f3daacae`  | src/app/(main)/local/\*_/_.tsx                         |
| `/marketing`                     | ✅ 100%     | `f3daacae`  | src/app/(main)/marketing/\*_/_.tsx                     |
| `/orders`                        | ✅ 100%     | `f3daacae`  | src/app/(main)/orders/\*_/_.tsx                        |
| `/quotes` (all)                  | ✅ 100%     | `f3daacae`  | src/app/(main)/quotes/\*_/_.tsx                        |
| `/reports/tour-closing`          | ✅ 100%     | `f3daacae`  | src/app/(main)/reports/tour-closing/\*_/_.tsx          |
| `/scheduling`                    | ✅ 100%     | `f3daacae`  | src/app/(main)/scheduling/\*_/_.tsx                    |
| `/settings`                      | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/page.tsx                       |
| `/settings/bot-line`             | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/bot-line/\*_/_.tsx             |
| `/settings/company`              | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/company/\*_/_.tsx              |
| `/settings/menu`                 | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/menu/\*_/_.tsx                 |
| `/settings/receipt-test`         | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/receipt-test/\*_/_.tsx         |
| `/settings/workspaces`           | ✅ 100%     | `f3daacae`  | src/app/(main)/settings/workspaces/\*_/_.tsx           |
| `/supplier/dispatch`             | ✅ 100%     | `f3daacae`  | src/app/(main)/supplier/dispatch/\*_/_.tsx             |
| `/supplier/requests` (all)       | ✅ 100%     | `f3daacae`  | src/app/(main)/supplier/requests/\*_/_.tsx             |
| `/supplier/trips`                | ✅ 100%     | `f3daacae`  | src/app/(main)/supplier/trips/\*_/_.tsx                |
| `/tenants` (all)                 | ✅ 95%      | `f3daacae`  | src/app/(main)/tenants/\*_/_.tsx                       |
| `/tools/flight-itinerary`        | ✅ 98%      | `f3daacae`  | src/app/(main)/tools/flight-itinerary/\*_/_.tsx        |
| `/tools/hotel-voucher`           | ✅ 98%      | `f3daacae`  | src/app/(main)/tools/hotel-voucher/\*_/_.tsx           |
| `/tools/reset-db`                | ✅ 100%     | `f3daacae`  | src/app/(main)/tools/reset-db/\*_/_.tsx                |
| `/tours`                         | ✅ 95%      | `f3daacae`  | src/app/(main)/tours/page.tsx                          |
| `/tours/[code]`                  | ✅ 100%     | `f3daacae`  | src/app/(main)/tours/[code]/\*_/_.tsx                  |
| `/unauthorized`                  | ✅ 100%     | `f3daacae`  | src/app/(main)/unauthorized/\*_/_.tsx                  |
| `/war-room`                      | ✅ 100%     | `f3daacae`  | src/app/(main)/war-room/\*_/_.tsx                      |
| `/m` (mobile home)               | ✅ 98%      | `f3daacae`  | src/app/m/page.tsx                                     |
| `/m/members/[id]`                | ✅ 100%     | `f3daacae`  | src/app/m/members/[id]/\*_/_.tsx                       |
| `/m/profile`                     | ✅ 100%     | `f3daacae`  | src/app/m/profile/\*_/_.tsx                            |
| `/m/search`                      | ✅ 100%     | `f3daacae`  | src/app/m/search/\*_/_.tsx                             |
| `/m/tours/[id]`                  | ✅ 100%     | `f3daacae`  | src/app/m/tours/[id]/\*_/_.tsx                         |

---

## B. 待修復問題

### /p/customized (2 violations)

| 行號                                       | 違規                        | 應替換為                     |
| ------------------------------------------ | --------------------------- | ---------------------------- |
| src/app/(public)/p/customized/page.tsx:92  | `bg-slate-900 to-slate-800` | `bg-background`              |
| src/app/(public)/p/customized/page.tsx:106 | `from-blue-500 to-cyan-400` | `from-primary to-primary/80` |

### /p/customized/[slug] (4 violations)

| 行號                                              | 違規              | 應替換為           |
| ------------------------------------------------- | ----------------- | ------------------ |
| src/app/(public)/p/customized/[slug]/page.tsx:326 | `bg-slate-900`    | `bg-background`    |
| src/app/(public)/p/customized/[slug]/page.tsx:334 | `bg-slate-900`    | `bg-background`    |
| src/app/(public)/p/customized/[slug]/page.tsx:348 | `bg-slate-900/80` | `bg-background/80` |
| src/app/(public)/p/customized/[slug]/page.tsx:395 | `bg-slate-800`    | `bg-muted`         |

### /p/customized/track/[code] (7 violations)

| 行號                                                    | 違規                            | 應替換為                                   |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| src/app/(public)/p/customized/track/[code]/page.tsx:55  | `bg-yellow-100 text-yellow-800` | `bg-status-warning/10 text-status-warning` |
| src/app/(public)/p/customized/track/[code]/page.tsx:59  | `bg-gray-100 text-gray-800`     | `bg-muted text-muted-foreground`           |
| src/app/(public)/p/customized/track/[code]/page.tsx:167 | `bg-slate-900`                  | `bg-background`                            |
| src/app/(public)/p/customized/track/[code]/page.tsx:175 | `bg-slate-900`                  | `bg-background`                            |
| src/app/(public)/p/customized/track/[code]/page.tsx:192 | `bg-slate-900/80`               | `bg-background/80`                         |
| src/app/(public)/p/customized/track/[code]/page.tsx:294 | `bg-slate-800/50`               | `bg-muted/50`                              |
| src/app/(public)/p/customized/track/[code]/page.tsx:321 | `bg-slate-800/50`               | `bg-muted/50`                              |

### /p/tour/[code] (29 violations)

| 行號                                        | 違規                           | 應替換為                 |
| ------------------------------------------- | ------------------------------ | ------------------------ |
| src/app/(public)/p/tour/[code]/page.tsx:249 | `text-gray-800`                | `text-foreground`        |
| src/app/(public)/p/tour/[code]/page.tsx:250 | `text-gray-600`                | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:290 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:298 | `text-slate-600`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:299 | `text-slate-600`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:311 | `border-slate-200/20`          | `border-border/20`       |
| src/app/(public)/p/tour/[code]/page.tsx:320 | `hover:bg-slate-100`           | `hover:bg-muted`         |
| src/app/(public)/p/tour/[code]/page.tsx:370 | `bg-slate-200`                 | `bg-border`              |
| src/app/(public)/p/tour/[code]/page.tsx:414 | `bg-slate-50`                  | `bg-muted`               |
| src/app/(public)/p/tour/[code]/page.tsx:416 | `text-slate-400`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:426 | `text-slate-300`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:427 | `text-slate-400`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:428 | `text-slate-400`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:437 | `border-slate-100`             | `border-border`          |
| src/app/(public)/p/tour/[code]/page.tsx:438 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:445 | `text-slate-400`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:448 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:460 | `hover:bg-slate-50`            | `hover:bg-muted`         |
| src/app/(public)/p/tour/[code]/page.tsx:492 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:523 | `bg-slate-50 border-slate-200` | `bg-muted border-border` |
| src/app/(public)/p/tour/[code]/page.tsx:527 | `border-slate-100`             | `border-border`          |
| src/app/(public)/p/tour/[code]/page.tsx:529 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:548 | `text-slate-500`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:565 | `text-slate-600`               | `text-muted-foreground`  |
| src/app/(public)/p/tour/[code]/page.tsx:570 | `text-slate-400`               | `text-muted-foreground`  |

### public/accommodation-quote (5 violations)

| 行號                                                                 | 違規                           | 應替換為                                        |
| -------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx:135 | `bg-amber-50 border-amber-200` | `bg-status-warning/10 border-status-warning/30` |
| src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx:136 | `text-amber-900`               | `text-status-warning`                           |
| src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx:197 | `bg-green-50 border-green-200` | `bg-morandi-green/10 border-morandi-green/30`   |
| src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx:200 | `text-green-900`               | `text-morandi-green`                            |
| src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx:217 | `text-green-700`               | `text-morandi-green`                            |

### public/activity-quote (5 violations)

| 行號                                                            | 違規                           | 應替換為                                        |
| --------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| src/app/public/activity-quote/[tourId]/[requestId]/page.tsx:135 | `bg-amber-50 border-amber-200` | `bg-status-warning/10 border-status-warning/30` |
| src/app/public/activity-quote/[tourId]/[requestId]/page.tsx:136 | `text-amber-900`               | `text-status-warning`                           |
| src/app/public/activity-quote/[tourId]/[requestId]/page.tsx:184 | `bg-green-50 border-green-200` | `bg-morandi-green/10 border-morandi-green/30`   |
| src/app/public/activity-quote/[tourId]/[requestId]/page.tsx:187 | `text-green-900`               | `text-morandi-green`                            |
| src/app/public/activity-quote/[tourId]/[requestId]/page.tsx:214 | `text-green-700`               | `text-morandi-green`                            |

### public/booking (11 violations)

| 行號                                           | 違規                            | 應替換為                      |
| ---------------------------------------------- | ------------------------------- | ----------------------------- |
| src/app/public/booking/[tourCode]/page.tsx:69  | `text-gray-800`                 | `text-foreground`             |
| src/app/public/booking/[tourCode]/page.tsx:70  | `text-gray-600`                 | `text-muted-foreground`       |
| src/app/public/booking/[tourCode]/page.tsx:82  | `bg-stone-50/80 text-stone-800` | `bg-muted/80 text-foreground` |
| src/app/public/booking/[tourCode]/page.tsx:165 | `bg-gray-50`                    | `bg-muted`                    |
| src/app/public/booking/[tourCode]/page.tsx:187 | `hover:bg-gray-50`              | `hover:bg-muted`              |
| src/app/public/booking/[tourCode]/page.tsx:220 | `text-gray-500`                 | `text-muted-foreground`       |
| src/app/public/booking/[tourCode]/page.tsx:225 | `text-gray-600`                 | `text-muted-foreground`       |
| src/app/public/booking/[tourCode]/page.tsx:236 | `text-gray-500`                 | `text-muted-foreground`       |
| src/app/public/booking/[tourCode]/page.tsx:241 | `bg-stone-100 border-stone-200` | `bg-muted border-border`      |
| src/app/public/booking/[tourCode]/page.tsx:243 | `text-gray-600`                 | `text-muted-foreground`       |

### public/insurance/[code] (9 violations — CRITICAL: hardcoded hex)

| 行號                                         | 違規                                     | 應替換為                               |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| src/app/public/insurance/[code]/page.tsx:119 | `backgroundColor:'#f8f6f3'`              | `var(--background)`                    |
| src/app/public/insurance/[code]/page.tsx:120 | `color:'#333'`                           | `var(--morandi-primary)`               |
| src/app/public/insurance/[code]/page.tsx:126 | `backgroundColor:'#fff'`                 | `var(--card)`                          |
| src/app/public/insurance/[code]/page.tsx:149 | `backgroundColor:'#fff'`                 | `var(--card)`                          |
| src/app/public/insurance/[code]/page.tsx:182 | `borderBottom:'1px solid #f0ece6'`       | `var(--border)`                        |
| src/app/public/insurance/[code]/page.tsx:183 | `backgroundColor:'#faf8f5'`              | `var(--background)`                    |
| src/app/public/insurance/[code]/page.tsx:213 | `backgroundColor:'#5b8c5a' color:'#fff'` | `var(--morandi-green)` + `var(--card)` |
| src/app/public/insurance/[code]/page.tsx:231 | `color:'#bbb'`                           | `var(--morandi-muted)`                 |

### public/itinerary (14 violations)

| 行號                                             | 違規                               | 應替換為                                |
| ------------------------------------------------ | ---------------------------------- | --------------------------------------- |
| src/app/public/itinerary/[tourCode]/page.tsx:69  | `text-gray-800 text-gray-600`      | `text-foreground text-muted-foreground` |
| src/app/public/itinerary/[tourCode]/page.tsx:82  | `bg-stone-50/80 text-stone-800`    | `bg-muted/80 text-foreground`           |
| src/app/public/itinerary/[tourCode]/page.tsx:136 | `border-gray-100 hover:bg-gray-50` | `border-border hover:bg-muted`          |
| src/app/public/itinerary/[tourCode]/page.tsx:142 | `text-gray-500`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:146 | `text-gray-500`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:148 | `text-gray-600`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:195 | `bg-gray-50`                       | `bg-muted`                              |
| src/app/public/itinerary/[tourCode]/page.tsx:196 | `border-gray-200`                  | `border-border`                         |
| src/app/public/itinerary/[tourCode]/page.tsx:250 | `text-gray-500`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:255 | `text-gray-600`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:266 | `text-gray-500`                    | `text-muted-foreground`                 |
| src/app/public/itinerary/[tourCode]/page.tsx:271 | `bg-stone-100 border-stone-200`    | `bg-muted border-border`                |
| src/app/public/itinerary/[tourCode]/page.tsx:273 | `text-gray-600`                    | `text-muted-foreground`                 |

### public/meal-quote (5 violations)

| 行號                                                        | 違規                           | 應替換為                                        |
| ----------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| src/app/public/meal-quote/[tourId]/[requestId]/page.tsx:135 | `bg-amber-50 border-amber-200` | `bg-status-warning/10 border-status-warning/30` |
| src/app/public/meal-quote/[tourId]/[requestId]/page.tsx:136 | `text-amber-900`               | `text-status-warning`                           |
| src/app/public/meal-quote/[tourId]/[requestId]/page.tsx:184 | `bg-green-50 border-green-200` | `bg-morandi-green/10 border-morandi-green/30`   |
| src/app/public/meal-quote/[tourId]/[requestId]/page.tsx:187 | `text-green-900`               | `text-morandi-green`                            |
| src/app/public/meal-quote/[tourId]/[requestId]/page.tsx:214 | `text-green-700`               | `text-morandi-green`                            |

### public/request/[token] (17 violations — CRITICAL: hardcoded hex)

| 行號                                        | 違規                             | 應替換為                   |
| ------------------------------------------- | -------------------------------- | -------------------------- |
| src/app/public/request/[token]/page.tsx:207 | `color:'#8B6914'`                | `var(--morandi-gold)`      |
| src/app/public/request/[token]/page.tsx:224 | `border:'1px solid #333'`        | `var(--morandi-primary)`   |
| src/app/public/request/[token]/page.tsx:227 | `background:'#f0f0f0'`           | `var(--morandi-container)` |
| src/app/public/request/[token]/page.tsx:232 | `border:'1px solid #ccc'`        | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:247 | `color:'#333'`                   | `var(--morandi-primary)`   |
| src/app/public/request/[token]/page.tsx:257 | `borderBottom:'3px double #333'` | `var(--morandi-primary)`   |
| src/app/public/request/[token]/page.tsx:271 | `borderBottom:'1px solid #ddd'`  | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:307 | `borderBottom:'1px solid #ddd'`  | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:338 | `borderBottom:'1px solid #ddd'`  | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:523 | `borderBottom:'1px solid #ddd'`  | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:564 | `borderBottom:'1px solid #ddd'`  | `var(--border)`            |
| src/app/public/request/[token]/page.tsx:585 | `border:'2px solid #999'`        | `var(--morandi-secondary)` |
| src/app/public/request/[token]/page.tsx:586 | `background:'#fff'`              | `var(--card)`              |
| src/app/public/request/[token]/page.tsx:587 | `color:'#333'`                   | `var(--morandi-primary)`   |
| src/app/public/request/[token]/page.tsx:603 | `background:'#8B6914'`           | `var(--morandi-gold)`      |
| src/app/public/request/[token]/page.tsx:604 | `color:'#fff'`                   | `white`                    |

### public/transport-quote/[tourId] (9 violations)

| 行號                                                 | 違規                                                             | 應替換為              |
| ---------------------------------------------------- | ---------------------------------------------------------------- | --------------------- |
| src/app/public/transport-quote/[tourId]/page.tsx:226 | `bg-green-50 border-green-200 text-green-900 text-green-700`     | morandi-green tokens  |
| src/app/public/transport-quote/[tourId]/page.tsx:249 | `bg-blue-50 border-blue-200 text-blue-900 text-blue-700`         | status-info tokens    |
| src/app/public/transport-quote/[tourId]/page.tsx:259 | `bg-yellow-50 border-yellow-200 text-yellow-900 text-yellow-700` | status-warning tokens |

### public/transport-quote/[tourId]/[requestId] (8 violations)

| 行號                                                                 | 違規                                                         | 應替換為                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| src/app/public/transport-quote/[tourId]/[requestId]/page.tsx:248-263 | `bg-green-100 text-green-700` (x4)                           | `bg-morandi-green/10 text-morandi-green` |
| src/app/public/transport-quote/[tourId]/[requestId]/page.tsx:283     | `bg-green-50 border-green-200 text-green-900 text-green-700` | morandi-green tokens                     |

**總計：13 路由、116 violations（含 2 個 CRITICAL hardcoded hex 路由）**

---

## C. 需要設計師確認

| #   | 項目        | 說明                                                                                                   | 狀態       |
| --- | ----------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | File 分類色 | `files/file-system.types.ts` — 12 個檔案類型標示色需設計師定義莫蘭迪對應色（hex for JS inline styles） | ⏳ pending |

---

## D. 色彩替換紀錄

> 全部已完成 (2026-04-05)，下次審計時作為「已知替換」參考

| 原始                      | 替換為                     | 檔案                          |
| ------------------------- | -------------------------- | ----------------------------- |
| `bg-indigo-500`           | `bg-status-info`           | database/page.tsx             |
| `text-destructive`        | `text-morandi-red`         | files/ (6 處)                 |
| `bg-muted`                | `bg-morandi-container`     | monitoring/page.tsx           |
| `text-muted-foreground`   | `text-morandi-secondary`   | monitoring/page.tsx           |
| `text-yellow-700`         | `text-morandi-gold`        | m/todos/TodoCard.tsx          |
| `bg-yellow-100`           | `bg-morandi-gold/10`       | m/todos/TodoCard.tsx          |
| `bg-slate-100`            | `bg-morandi-container`     | m/workbench/page.tsx          |
| `text-slate-600`          | `text-morandi-secondary`   | m/workbench/page.tsx          |
| `via-sky-50/30`           | `via-morandi-container/30` | todos/page.tsx                |
| `accent-primary`          | `accent-morandi-gold`      | finance/travel-invoice/create |
| 38+ hex in CalendarStyles | CSS 變數                   | CalendarStyles.tsx            |
| 15+ hex in AttractionsMap | 莫蘭迪常數                 | AttractionsMap.tsx            |
| Channel 旅伴模式          | 整體移除                   | 14 檔案刪除、8 檔案編輯       |

---

## 修復紀錄

| 日期       | 內容                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-05 | 首次全面審計完成，115 路由，整體合規率 ~94%                                                                                                 |
| 2026-04-05 | 修復 5 大違規：CalendarStyles CSS 變數化、AttractionsMap 莫蘭迪化、移除旅伴模式、Files destructive→morandi-red、database indigo→status-info |
| 2026-04-05 | 修復剩餘 11 項違規 + 建立 UI 元素總表 (UI_ELEMENT_CATALOG.md)                                                                               |
| 2026-04-05 | 增量審計：新增 3 合規路由、發現 13 public 路由共 116 violations（含 2 CRITICAL hardcoded hex）                                              |
| 2026-04-05 | 加入檔案追蹤機制：A 區新增基準 commit + 檔案路徑，E 區追蹤共用元件                                                                          |

---

## E. 已檢查共用元件（非路由檔案）

> 下次審計用 `git diff --name-only f3daacae HEAD -- src/components/ src/features/` 找出異動檔

| 檔案                                         | 基準 commit | 合規 |
| -------------------------------------------- | ----------- | ---- |
| src/components/layout/sidebar.tsx            | `f3daacae`  | ✅   |
| src/components/layout/mobile-sidebar.tsx     | `f3daacae`  | ✅   |
| src/components/table-cells/index.tsx         | `f3daacae`  | ✅   |
| src/components/mobile/cards/TodoCard.tsx     | `f3daacae`  | ✅   |
| src/components/workspace/AdvanceListCard.tsx | `f3daacae`  | ✅   |
| src/components/workspace/ChannelChat.tsx     | `f3daacae`  | ✅   |
| src/app/globals.css                          | `f3daacae`  | ✅   |
