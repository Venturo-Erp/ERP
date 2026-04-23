# Discovery Master Index

**整合時間**：2026-04-21 連續 session
**Subagent 產出**：`discovery/` 8 份報告（A1-A8）
**目的**：Phase A 全範圍盤點產物、Wave 執行時直接讀對應 detail 不用重盤

---

## 各 Wave 關鍵發現彙整

### Wave 2 · 權限守衛（擴大）— 見 A1

**震撼**：121 個 page.tsx、**90 頁裸奔**（74%）、**0 頁用 useTabPermissions**。

| 類別 | 頁數 |
|--|--|
| HAS_TAB_PERMISSION | 0 |
| HAS_HARDCODE | 5 |
| PARTIAL | 5 |
| NO_GUARD 🔴（財務/法律） | 54 |
| NO_GUARD 🟡（系統主管 類） | 19 |
| NO_GUARD 🟢（操作類） | 21 |
| PERSONAL（my-*） | 7 |
| REDIRECT_ONLY | 10 |

**工期修正**：S-M → **L-XL**（不是 migrate、是從零建 90 頁 guard）
**執行策略**：分 4 batch 依風險（finance 13 → HR 系統主管 11 → settings 7 → 操作 21）

**Detail**：`discovery/A1_all_routes_guard.md`

---

### Wave 4 + Wave 9 · 反 pattern + 幽靈欄位 — 見 A2 + A4

#### A2 反 pattern 深掃

| Pattern | Count | Wave |
|--|--|--|
| audit `\|\| ''` | **0** ✅ | — |
| `'current_user'` | **0** ✅ | — |
| `as unknown as` | **330** | Wave 4/9 |
| └ PHANTOM_FIELD | 45 | Wave 4 🔴 |
| └ UNNECESSARY | 120 | Wave 4 🟡 |
| └ LIBRARY_WORKAROUND | 165 | 保留 ⚪ |
| 硬編 UUID | 14 | Wave 3 🟠 |
| spread insert/update | **1** | Wave 4 🔴 |
| supabase.from in page.tsx | 6 files (25 queries) | Wave 4/9 🟡 |
| magic string filter | ~80 | Wave 9 🟡 |
| `location` 死欄位 ref | 20（全 read-only） | Wave 9 🟢 |

#### A4 幽靈欄位細節

| 問題 | 做法 | 工期 |
|--|--|--|
| quotes 7 欄位 | **刪 type**（DB 沒這些欄、form-only） | 3 files、6 read 點清 |
| customers LINE 5 casts | **加 type**（DB 有欄、type 缺） | 2 files |
| payment_requests 2 soft-delete 欄 | **加 type** | 2 files |

**Wave 4 總工期**：2-3 小時（25 行 × 10 檔、低風險）

**Details**：`discovery/A2_antipatterns.md`、`discovery/A4_phantom_fields.md`

---

### Wave 4 補 · Dead 驗證修正 — 見 A3

**4 個 dead dialog 真實情況**：
- QuickReceipt — **還在用**（audit 當初誤標）
- BatchReceiptDialog — **還在用**
- BatchReceiptConfirmDialog — **真 dead** ✅
- ResetPasswordDialog — UI 在但按不到 ✅

→ 實際只 2 個 dead、不是 4 個。

**126 張真死表（12 張抽驗）**：
- 真死 5 張（emails 家族、tour_control_forms）
- False positive 1 張（cost_templates entity hook 有、沒實際呼叫）
- 需 review 6 張
- **外推：~50/126 張真能搬**（grep 會漏 type import / entity 封裝）

**Detail**：`discovery/A3_dead_verification.md`

---

### Wave 5 + Wave 6 · SSOT + CASCADE — 見 A5

#### Wave 6 規模爆表 🔴

- 原以為：4 張表 CASCADE
- **實際：271 條 CASCADE FK**
- 144 SET NULL、4 RESTRICT、1 NO ACTION

**Critical 必改**：
- `payment_request_items.request_id` CASCADE → **財務審計會被連帶毀**
- `messages.parent_message_id` CASCADE → thread 毀
- `receipt_payment_items.receipt_id` CASCADE
- `traveler_*` 一大堆

**Wave 6 工期**：S → **L-XL**（270+ 條 ALTER CONSTRAINT）

#### Wave 5 縮水 🟢

**orders 5 人數欄位真相**：
- 實際欄位：`adult_count/child_count/infant_count/member_count/total_people`
- **只 2 處寫入**、都正確同步 `member_count`
- 其他 4 欄早就沒人寫 = dead column
- **不需要 trigger**、只需 DROP 4 個 dead column

**JSONB 雙軌不是問題**：
- `quotes.categories` — SSOT 是 tour_itinerary_items、LOW 風險
- `payment_requests.items` — 所有寫入走 payment_request_items、**零 drift**
- audit 當初看錯、**Wave 5 少一項**

**Wave 5 工期**：L → **S**（只 DROP 4 欄、零 code 改）

**Detail**：`discovery/A5_fk_cascade_trigger.md`

---

### Wave 3 · 多租戶隔離 — 見 A6

**新發現（真 bug）**：
- **LOGAN_ID 真衝突**：`logan-service.ts:11` + `workspace.ts:66` 寫 `000...001`；`cron/sync-logan-knowledge/route.ts:18` 寫 `000...002`
- 症狀：cron 寫 memories 到 ID-B、service 讀 ID-A → **孤兒紀錄**
- 要先查 DB 實際 logan employee 是哪個 ID、統一

**其他硬編**：
- CORNER_WORKSPACE_ID：6 處、5 處危險 + 1 處合理（Michelin feature gate）
- Payment method UUIDs：2 處（AddRequestDialog 的預設匯款/batch）
- LINE Bot ID：2 處 silent env fallback（應 fail-fast）

**產出**：`well-known-ids.ts` 完整設計 + 6 phase plan 7-8 天
**Detail**：`discovery/A6_tenant_isolation.md`

---

### Wave 7 · 大重構 — 見 A7

**更正 BACKLOG stale**：
- `/quotes/[id]/page.tsx` **不存在**、BACKLOG L214 stale
- 真問題是 `QuoteDetailEmbed.tsx` 737 行本身
- BACKLOG 要改寫

**三個目標**：
| 檔案 | LOC | 風險 | 產出 shell |
|--|--|--|--|
| `AddRequestDialog.tsx` | 1474 | HIGH（動錢 critical path） | ~140 + 8 新檔 |
| `QuoteDetailEmbed.tsx` | 737 | MEDIUM | ~60 shell + 6 新檔（`<QuoteDetailCore>`） |
| `customers/page.tsx` | 562 | LOW-MED | ~50 shell（INV-P01 達標） |

**執行順序（低風險先）**：customers → QuoteDetailCore → AddRequestDialog

**Detail**：`discovery/A7_large_refactor.md`

---

### Wave 8 · 狀態值中英 — 見 A8

**狀態欄位全盤**：
- 10 status 欄位 / 9 表 / 18 中文值
- **4 表已合規**：quotes / todos / employees / syncQueue（英 + CHECK）
- 6 表待改：tours / orders / payments / payment_requests / disbursement_orders / receipt_orders / visas

**策略**：Option A（DB 英 + `status-maps.ts` 翻中）
- 現有翻譯層在、backward compat
- 40-50 files 使用 status、~5-10 直接塞中文字串（需清）

**工期**：~2 天 M、LOW 風險

**Detail**：`discovery/A8_status_normalization.md`

---

## 工期重估（Phase A 完整盤點後）

| Wave | 原估 | 修正後 |
|--|--|--|
| Wave 0 | ✅ 完成 | — |
| Wave 1 | ✅ 完成 | — |
| Wave 2 | M | **L-XL**（90 頁從零、Agent 估 M-L） |
| Wave 2.5 | S | S（10 分鐘 NO FORCE 28 張） |
| Wave 3 | M-L | **L**（7-8 天、含 LOGAN 修 bug） |
| Wave 4 | L | **S-M**（2-3 小時 + dead 清理小） |
| Wave 5 | L | **S**（DROP 4 欄） |
| Wave 6 | S-M | **L-XL**（270+ ALTER） |
| Wave 7 | L | **L**（3 檔、可分次做、非上線阻擋） |
| Wave 8 | L | **M**（2 天、LOW 風險、翻譯層在） |
| Wave 9 | M | M（magic string + location + label rename） |

**Phase B 總工期估**：原 6-10 天 → **修正後約 12-18 天**
（主要加在 Wave 2 從零建 + Wave 6 規模 + Wave 3 Logan bug 修 + Wave 7 三檔重構）

---

## 最值得注意的發現

1. **0 頁用 useTabPermissions**——Wave 2 是從零開始、不是 migrate
2. **271 CASCADE FK**——Wave 6 遠比想像大、含財務審計連帶毀風險
3. **Wave 5 根本不用 trigger**——orders 5 欄只有 1 個活著、JSONB 雙軌其實沒雙軌
4. **126 真死表只剩 ~50 真能搬**——grep 漏抓 type import
5. **audit 標的 4 dead dialog 只有 2 個真 dead**

---

## ✅ 全 8 份 discovery 完成（A1-A8）

| Agent | Wave 對應 | 檔案 |
|--|--|--|
| A1 | Wave 2 | `A1_all_routes_guard.md` |
| A2 | Wave 4/9 | `A2_antipatterns.md` |
| A3 | Wave 4 補驗證 | `A3_dead_verification.md` |
| A4 | Wave 4 幽靈欄位 | `A4_phantom_fields.md` |
| A5 | Wave 5/6 | `A5_fk_cascade_trigger.md` |
| A6 | Wave 3 | `A6_tenant_isolation.md` |
| A7 | Wave 7 | `A7_large_refactor.md` |
| A8 | Wave 8 | `A8_status_normalization.md` |

---

_完整 detail 在各 `A[1-8]_*.md`、Wave 執行時直接讀對應那份、不用再盤。_
