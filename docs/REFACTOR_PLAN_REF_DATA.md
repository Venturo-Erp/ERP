# 參考資料重構計畫：國家 / 機場 / 目的地 SSOT 化

**日期**：2026-04-15（v2 — 納入實際盤點結果）
**狀態**：計畫已定，等待執行批准
**原則**：**業務感覺不出差別，底層變得很乾淨**

---

## 〇、這份文件的定位

這份文件是整個參考資料（國家 / 機場 / 目的地）SSOT 重構的**單一計畫來源**。任何時候回來 review，只需要看這一份。

同時這份重構必須配合 `CLAUDE.md` 的硬性規則執行：

- 動手前讀 `docs/CODE_MAP.md`
- 改 symbol 前跑 `gitnexus_impact`
- 不用 `--no-verify` 繞 hook
- commit 前跑 `gitnexus_detect_changes`

---

## 一、四條核心原則（貼在螢幕上）

1. **業務感覺不出差別，底層變得很乾淨**
   老使用者打 NRT、NTO 的肌肉記憶完全保留；底層只是把資料放對位子。

2. **目的地是主角，交通節點是配角**
   誠實反映旅遊的真實結構：小琉球、Pattaya、京都都是一等公民，機場只是「怎麼去」的其中一種方式。

3. **代號是 UX 的主角，搜尋框一個通吃**
   NRT、NTO、YLN、PAT 都是三碼速記，業務打字的體驗完全一樣；背後可能是機場表也可能是目的地表。

4. **市場適配在 workspace 層，不在 schema 層**
   主場國家 + 輸入模式都是 workspace 設定；一套 schema 服務台灣、日本、泰國、歐洲、未來郵輪陸線都行。

---

## 二、實際盤點結果（這是做決策的依據）

### 資料層現況（2026-04-15 從 DB 取得）

**`ref_airports`：per-workspace 架構，不是全域共享**

- 現有 3 個 workspace（CORNER 主租戶 + 富順 + 勁揚）
- 每個 workspace 各有 87 筆 unique IATA → 總計 **259 列**
- 每新增一個 workspace 都會再複製一份
- 這比原本以為的「NULL = 共用」還糟

**台灣機場現況：15 筆/workspace，其中 6 筆是假 IATA**
| code | 真實意涵 | 狀態 |
|---|---|---|
| TPE、TSA、KHH、RMQ、TNN、CYI、HSZ、HUN、TTT | 真 IATA（台灣商用/軍民機場） | ✅ 保留 |
| YLN | 宜蘭（無機場） | ❌ 假 IATA，要搬到 destinations |
| KTG | 墾丁（無機場） | ❌ 同上 |
| CHW | 彰化（無機場） | ❌ 同上 |
| NTO | 南投（無機場） | ❌ 同上 |
| MLC | 苗栗（無機場；真 IATA 是 Malacca 麻六甲） | ❌ 同上 + 命名衝突 |
| **TYN** | **桃園**（**真 IATA 是太原 Taiyuan，中國山西**） | ❌ **命名衝突炸彈** |

### 業務層現況（2026-04-15）

- 全系統 **tours 共 30 筆**
- 引用假 IATA 的 tours：**0 筆**（YLN/KTG/NTO/CHW/TYN/MLC 全部 0）
- 唯一有疑慮的是 `HHQ`：**1 筆 tour（PROP-X1OHIARA 泰國華欣）在用，但 HHQ 其實是真 IATA（華欣機場），只是 seed 漏了**

### 關鍵結論

1. **現在是下刀的完美時機**：tours 量還少、0 筆用假 IATA、重構幾乎零遷移風險
2. **TYN 改名零風險**：沒有 tour 會壞，改完馬上乾淨
3. **Per-workspace ref_airports 要一起處理**：不然每新增一個租戶就多 87 筆複製，越晚越糟
4. **HHQ 要補進 seed**：這是真 IATA，漏掉是 bug

---

## 三、最終架構（定案）

### 資料層級

| 層級                | 表                                                  | 擁有者          | 寫入權限                  | 性質             |
| ------------------- | --------------------------------------------------- | --------------- | ------------------------- | ---------------- |
| **L1 全球參考**     | `ref_countries`、`ref_airports`、`ref_destinations` | 平台（Venturo） | 擁有平台管理資格的人 only | 客觀世界事實     |
| **L2 租戶 overlay** | `workspace_countries`（第一版只有啟用開關）         | 該租戶          | 該租戶                    | 啟用範圍         |
| **L3 租戶業務**     | `tours`、`itineraries` 等既有表                     | 該租戶          | 該租戶                    | 引用 L1 的自然鍵 |

### 三張 L1 表的職責分工

**`ref_countries`**

- PK = ISO 2 碼（`code`）
- 欄位：`code`、`name_zh`、`name_en`、`emoji`、`continent`、`is_active`
- 249 個國家一次灌滿

**`ref_airports`**（純 IATA）

- PK = IATA 3 碼（`iata_code`）
- 只存「世界上真的存在的機場」
- 清掉所有假 IATA（YLN、KTG、NTO、CHW、MLC、TYN 等）
- 無 `workspace_id` 欄位（不再 per-workspace）

**`ref_destinations`**（非機場目的地）

- PK = 自訂 code，例：`TW-YILAN`、`TW-KENTING`、`TW-LIUQIU`、`TH-PATTAYA`、`JP-KYOTO`
- 選填欄位：`short_alias`（三碼速記，例 YLN、KTG、PAT、KYT）
- 必填：`country_code`、`name_zh`、`name_en`
- 選填：`parent_code`（層級支援）、`type`（city/region/island/scenic_spot/district）、`default_airport`（鄰近機場建議）
- **遵守 BUSINESS_MAP.md 已規劃的多語言 + Google Maps 欄位**：
  `name_zh_tw`、`name_zh_cn`、`name_en`、`name_th`、`name_ja`、`name_ko`
  `google_maps_url`、`google_place_id`、`latitude`、`longitude`

### 業務表改動（tours 為例）

- **保留**：`airport_code`、`country_id` 欄位名（避免全站改 code）
- **新增**：`destination_code` 欄位（選填，逐步 backfill）
- **團號生成器**：`generateTourCode()` 的輸入從「airport_code」擴充成「primary_code」，可接受 `ref_airports.iata_code` 或 `ref_destinations.short_alias`
- **業務看到的團號格式完全不變**：`JY-NTO250128A` 還是 `JY-NTO250128A`，差別只在 NTO 背後從 `ref_airports` 移到了 `ref_destinations`

---

## 四、執行計畫（分階段）

每個 Stage 獨立可驗證、獨立可回滾、每一 Stage 結束都停下來等使用者 review。

### Stage 0：前置驗證（開工前必做）

- [ ] 讀 `docs/CODE_MAP.md` 中關於 tours、airports、country selector 的段落
- [ ] 跑 `gitnexus_impact` on `generateTourCode`、`useAirports`、`CountryAirportSelector`、`useTourOperations`（**若 gitnexus MCP 在本 session 不可用，明確報告，改用 grep+手動驗證方式補上**）
- [ ] 確認沒有其他人正在改這幾張表
- [ ] 把 DB 現狀備份 snapshot（至少 `ref_airports`、`countries`、`tours.code` 的 dump）
- [ ] 使用者批准執行 Stage 0.5

---

### Stage 0.5：緊急拆雷（零風險，先做）

**目標**：把 TYN 這顆命名衝突炸彈拆掉，同時補 HHQ seed 漏洞。

| 步驟  | 動作                                                                                             | 驗證                                                                    |
| ----- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 0.5.1 | `ref_airports` 裡所有 3 個 workspace 的 TYN 行改名為 `TYU`（或其他未被 IATA 佔用的代號）代表桃園 | `SELECT iata_code FROM ref_airports WHERE city_name_zh='桃園'` 回傳 TYU |
| 0.5.2 | 灌 HHQ（Hua Hin 華欣）正式 IATA 資料到 `ref_airports`                                            | 3 個 workspace 各出現 1 筆 HHQ                                          |
| 0.5.3 | grep 整個 codebase 是否有 hardcode `'TYN'` 字串（`src/lib/constants/airports.ts` 等）            | 全部更新或確認無                                                        |
| 0.5.4 | `tours.airport_code = 'TYN'` 的筆數（預期 0 筆，根據盤點）                                       | 確認為 0                                                                |

**業務感受**：無差別（0 tours 受影響）
**底層變化**：TYN 不再撞太原、華欣從真 IATA 能正確 lookup
**回滾方式**：migration 反向即可

---

### Stage 1：`ref_airports` 全域化 + 清假 IATA

**目標**：`ref_airports` 從 per-workspace 3 份拷貝變成單一全域表，同時把假 IATA 搬到 `ref_destinations`。

#### 1A：建立 `ref_destinations`（新表）

| 步驟 | 動作                                                               |
| ---- | ------------------------------------------------------------------ |
| 1.1  | 建 `ref_destinations` 表（schema 如第三節所述，含多語言欄位）      |
| 1.2  | 建立 short_alias unique index，避開 IATA 命名空間                  |
| 1.3  | RLS：SELECT 任何 authenticated user；其餘只限 擁有平台管理資格的人 |

#### 1B：搬家假 IATA

| 步驟 | 動作                                                                                              | 驗證                                         |
| ---- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1.4  | 把 YLN、KTG、CHW、NTO、MLC 這 5 筆從 `ref_airports` 搬到 `ref_destinations`（保留原 short_alias） | `ref_destinations` 出現 5 筆台灣非機場目的地 |
| 1.5  | 從 `ref_airports` 刪除這 5 筆（3 個 workspace × 5 = 15 筆被刪）                                   | `ref_airports` 總列數從 259 降到 244         |
| 1.6  | `tours.airport_code` 若有對應到這 5 碼的也需更新（0 筆，驗證後跳過）                              | 0                                            |

#### 1C：`ref_airports` 全域化

| 步驟 | 動作                                                                                      | 驗證                    |
| ---- | ----------------------------------------------------------------------------------------- | ----------------------- |
| 1.7  | 選擇主 workspace（CORNER）的 `ref_airports` 資料作為 canonical                            | 保留 87 筆              |
| 1.8  | 刪除其他 2 個 workspace 的重複資料                                                        | 總列數 87               |
| 1.9  | DROP `workspace_id` 欄位                                                                  | schema check            |
| 1.10 | 重寫 RLS：任何 authenticated user 可 SELECT；INSERT/UPDATE/DELETE 只限 `is_super_admin()` | 一般帳號 write 失敗     |
| 1.11 | 廢除 `/api/airports` 的 POST（或加 擁有平台管理資格的人 守門）                            | 403 on 沒有系統主管資格 |

#### 1D：UI / query 層配合

| 步驟 | 動作                                                                                                            | 驗證                              |
| ---- | --------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1.12 | `useAirports()`、`CountryAirportSelector`、`destination-selector`：讀 `ref_airports` 時不再帶 workspace_id 過濾 | 機場選單正常                      |
| 1.13 | 搜尋框 UNION `ref_destinations.short_alias` + `ref_destinations.name_zh`（同一個 dropdown 通吃）                | 打 YLN 能找到宜蘭                 |
| 1.14 | `generateTourCode()` 接受 destination short_alias 或 IATA 當輸入                                                | 建一個宜蘭團驗證團號 `JY-YLN...A` |

**業務感受**：

- 下拉選單看起來一樣（機場 + 目的地混排，以代號為主標）
- 團號生成照舊
- 建團流程完全一樣
- 唯一差別：新增目的地時，打「小琉球」也能找到（原本找不到）

**底層變化**：

- `ref_airports` 從 259 列 → 87 列（節省 67% 儲存）
- 假 IATA 搬到正確的家
- TYN、MLC 命名衝突消失
- `ref_destinations` 就位，下一階段業務表可以開始用它

**回滾方式**：

- 保留舊資料 snapshot
- 可用 revert migration 恢復 per-workspace 架構
- 但理論上一旦驗證通過就不需要 revert

⚠️ **這是本次重構的核心刀，完成後務必全站煙霧測試**：

- 建新團（出國 + 國內）
- 開啟歷史團
- 機場/目的地下拉選單
- PNR 解析
- 航班查詢

---

### Stage 2：`ref_countries` 建立 + 灌 249 國

**目標**：建立乾淨的 `ref_countries`，為後續業務表 FK 遷移做準備。

| 步驟 | 動作                                                     | 驗證        |
| ---- | -------------------------------------------------------- | ----------- |
| 2.1  | 建 `ref_countries` 表（PK = ISO code），加基本欄位       | schema      |
| 2.2  | 灌 ISO 3166-1 249 筆國家資料                             | count = 249 |
| 2.3  | RLS：同 `ref_airports`                                   | 測試        |
| 2.4  | 建 `workspace_countries` overlay 表（只有 `is_enabled`） | schema      |
| 2.5  | 寫 helper `is_country_enabled()`                         | SQL 測試    |

**業務感受**：無差別
**風險**：🟢 低（純新增）

---

### Stage 3：業務表 FK 遷移（最高風險）

**目標**：把 13 張依賴舊 `countries` 的表改成指向 `ref_countries.code`（text）。

**子步驟**（每張表一個 migration，分批上線）：

- 3A：3 張硬 FK（`luxury_hotels`、`restaurants`、`transportation_rates`）
- 3B：10 張軟參考表（`attractions`、`quotes` 等）
- 3C：`cities` / `regions` 只換 FK 指向，不動表結構

**詳細步驟與原 v1 相同**（保持 24 個檔案的更新路徑）。

⚠️ 這個 Stage 風險最高，必須：

- 逐表 `gitnexus_impact` 分析
- 逐批 smoke test
- 保留舊 `countries` 表做 compatibility view 至少 2 週

---

### Stage 4：租戶 UI —「國家啟用」區塊

**目標**：在 `/settings/workspaces` 加國家啟用開關 + 主場國家設定。

| 步驟 | 動作                                                                |
| ---- | ------------------------------------------------------------------- |
| 4.1  | 新增「國家範圍」區塊（按洲分組 + toggle）                           |
| 4.2  | 新增「主場國家」下拉（`workspaces.home_country_code`）              |
| 4.3  | 新增「輸入模式」選擇（airport-first / destination-first / hybrid）  |
| 4.4  | `CountryAirportSelector` 加 workspace_countries JOIN 過濾           |
| 4.5  | **歷史資料不過濾**（舊團即使國家已停用也照常顯示）                  |
| 4.6  | 顯示 helper：`displayCountry(code, workspace)` → 主場國顯示「國內」 |

---

### Stage 5：清理舊 `countries` 表

- 確認全站無引用（gitnexus + grep 雙驗證）
- 建 view `countries` → `ref_countries` 作 compatibility shim
- 觀察 1-2 週
- DROP view

---

## 五、風險總表（根據實際盤點更新）

| Stage | 風險    | 原因                                                 | 緩解                         |
| ----- | ------- | ---------------------------------------------------- | ---------------------------- |
| 0.5   | 🟢 極低 | 0 tours 用 TYN、HHQ 補漏                             | 幾乎零風險                   |
| 1     | 🟢 低   | 0 tours 用假 IATA、per-workspace → global 只是刪重複 | 保 snapshot                  |
| 2     | 🟢 低   | 純新增                                               | —                            |
| 3     | 🔴 高   | 24 檔案 + 3 硬 FK 業務表                             | 分批 + smoke test + gitnexus |
| 4     | 🟡 中   | UI 過濾邏輯可能誤擋歷史                              | 歷史路徑明確跳過過濾         |
| 5     | 🟢 低   | 漏改會失敗，但有 view                                | compat view                  |

---

## 六、檢查清單

### Stage 0.5 完成條件

- [ ] TYN 改名完成，0 tours 受影響
- [ ] HHQ 正式進 seed
- [ ] `src/lib/constants/airports.ts` hardcode 檢查完成
- [ ] smoke test：開 PROP-X1OHIARA 團，華欣顯示正常

### Stage 1 完成條件

- [ ] `ref_destinations` 表存在、RLS 正確
- [ ] YLN/KTG/CHW/NTO/MLC 在 `ref_destinations` 而非 `ref_airports`
- [ ] `ref_airports` 總列數 = 87（從 259 降下來）
- [ ] `ref_airports.workspace_id` 欄位已移除
- [ ] 搜尋框打 YLN、宜蘭、NRT、NTO 都能找到
- [ ] `generateTourCode()` 用 NTO 能生成正確團號
- [ ] 3 個 workspace 都能正常建團

### Stage 2 完成條件

- [ ] `ref_countries` 249 筆
- [ ] `workspace_countries` 表就位

### Stage 3 完成條件

- [ ] 13 張業務表全部指向 `ref_countries.code`
- [ ] 24 檔案全部通過 type-check
- [ ] 全站 smoke test 通過

### Stage 4 完成條件

- [ ] 租戶管理頁有國家啟用區塊
- [ ] 主場國家顯示為「國內」
- [ ] 歷史團不受過濾影響

### Stage 5 完成條件

- [ ] 舊 `countries` 表 DROP
- [ ] 無引用遺跡

---

## 七、尚未定案 / 刻意擱置

| 項目                                                   | 決定    | 理由                                                   |
| ------------------------------------------------------ | ------- | ------------------------------------------------------ |
| `cities` / `regions` 拆成 `ref_cities` / `ref_regions` | ❌ 不做 | 避免雪球；FK 改指向即可                                |
| 景點 / 飯店 / 餐廳 UI 重構                             | ❌ 另案 | 不同軌道，等 SSOT 穩了再處理                           |
| 租戶自訂機場能力（`/api/airports` POST）               | ❌ 廢除 | 只有 擁有平台管理資格的人 能動 ref                     |
| 交通節點擴充（火車站、港口、客運站）                   | ⏸️ 預留 | `ref_transit_hubs` 概念已留，第一版只啟用 airport type |
| 多語言欄位灌值                                         | ⏸️ 選填 | Phase 1 只填繁中 + 英文，其他語言等需要時 API 補       |
| Google Maps API 整合                                   | ⏸️ 另案 | BUSINESS_MAP 已規劃但非本次範圍                        |

---

## 八、一句話定調

> **把世界的真實結構寫進資料庫，把不同市場的使用習慣做成 workspace 設定，讓每個業者都以為這是為他們量身打造的。**

業務看到的系統跟今天一模一樣；底層從「三份 per-tenant 拷貝 + 假 IATA 污染 + TYN 炸彈」變成「一份全域乾淨的參考表 + 目的地一等公民 + 租戶只管自己的啟用範圍」。

---

## 九、下一步

1. **使用者 review 這份計畫**
2. **跑 Stage 0 前置驗證**（讀 CODE_MAP、gitnexus impact）
3. **執行 Stage 0.5**（零風險先做）
4. **Review → 執行 Stage 1**
5. 依序往下

每個 Stage 結束都停下來回報 + 等下一步指示。**不會連續跑完所有 Stage**。
