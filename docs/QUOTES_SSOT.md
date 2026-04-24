# 報價單 SSOT 規則

> 2026-04-24 建立。本文件是 quotes 表結構與業務規則的單一真相。

## 🍇 葡萄串模型

```
[ 一個團（tours.id） = 葡萄梗 ]
    │
    ├─ 葡萄一：quote_type = 'standard'   （主報價，0 或 1 張）
    ├─ 葡萄二：quote_type = 'quick'      （快速報價，0~N 張）
    ├─ 葡萄三：quote_type = 'quick'
    └─ ...

每張報價自己貼了「我屬於哪團」的標籤：quotes.tour_id
要找報價 → 用 quotes.tour_id 反查、永遠唯一答案
```

## 規則

| #   | 規則                                                                                           |
| --- | ---------------------------------------------------------------------------------------------- |
| 1   | 一張報價屬於哪個團，**只看 `quotes.tour_id`**。這是唯一真相。                                  |
| 2   | 一個團能有 **0 或 1 張**「主報價」（`quote_type='standard'`）                                  |
| 3   | 一個團能有 **0 到 N 張**「快速報價」（`quote_type='quick'`），用於收訂金、尾款、雜項收款       |
| 4   | 未來新增第 3 種報價類型 → 加新 `quote_type` 值（如 `'flight_only'`、`'hotel_only'`），結構不動 |
| 5   | **不准存「捷徑指針」**（例：tours.quote_id 已於 2026-04-24 拔除）。要找主報價就反查。          |

## 怎麼撈

| 場景         | Query                                                         |
| ------------ | ------------------------------------------------------------- |
| 主報價       | `WHERE tour_id=X AND quote_type='standard'` → 0 或 1 筆       |
| 快速報價歷史 | `WHERE tour_id=X AND quote_type='quick' ORDER BY created_at`  |
| 算總收款     | `SUM(received_amount) WHERE tour_id=X AND quote_type='quick'` |
| 全部報價     | `WHERE tour_id=X`                                             |

## 為什麼拔掉 `tours.quote_id`

過去 tours 表有個 `quote_id` 欄位、想當「主報價的快速捷徑」。實際造成 SSOT 破碎：

- 2026-04-24 全表掃描：16 個有 `quote_id` 的團、**6 個（37.5%）指錯到 quick 報價**
- 根因：建立快速報價時、code 誤把 `tour.quote_id` 更新成 quick 的 id
- 影響：主報價分頁顯示錯誤的報價單給業務看
- 解法：拔掉欄位、所有 code 改用 `tour_id + quote_type` 反查

**葡萄掛在哪條梗、葡萄自己有標籤就好。梗上不需要插小旗子。**

## 業務情境（未來品類擴張預備）

Venturo 從「旅遊團 ERP」演化成「旅遊業多品類 ERP」：

- **完整旅遊團**：1 張 standard（總方案）+ N 張 quick（收款明細）
- **單品服務（機票/飯店/簽證）**：可能 0 張 standard + 1 張 quick（直接報價收款）
- **未來品類**：加新 `quote_type` 值即可、不動 schema

主報價分頁的 UI 必須容忍「沒有 standard 的團」這種情境（不強制要建主報價）。

## 廢欄位歷史

- `tours.quote_id` — 2026-04-24 拔除（本次清理）
- `quotes.proposal_package_id` — 2026-04-24 拔除（當初 cleanup migration 漏拔）
- `tours.tour_type` — 2026-04-23 拔除（改用 `tours.status`）
- `tours.proposal_id` / `proposal_package_id` / `converted_from_proposal` — 2026-03-14 拔除

## 相關檔案

- `src/features/tours/components/tour-quote-tab-v2.tsx` — 主報價分頁 UI
- `src/features/tours/hooks/useQuoteLoader.ts` — 報價載入邏輯
- `src/features/quotes/hooks/useQuoteTour.ts` — 報價↔團綁定
- `src/types/quote.types.ts` — TypeScript 型別
- `docs/BUSINESS_MAP.md` — 業務流程全景
