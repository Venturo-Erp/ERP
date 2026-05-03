---
type: concepts
status: archive
freshness: stable
updated: 2026-05-03
summary: Venturo ERP 概念架構圖 — SSOT 三巨頭（人資 / 旅遊團 / 財務）、旅遊團主鏈、業務流程脈絡（非路由樹、見 SITEMAP.md）
related: SITEMAP.md
---

# Venturo ERP — 概念架構（業務脈絡）

> 本檔是 ERP **業務流程 / SSOT 概念**架構圖。
> 路由 sitemap 見 [[SITEMAP]]。
>
> **角色分工**：
> - [[SITEMAP]] = 「網站長什麼樣」（路由樹、頁面導航）
> - 本檔 = 「業務怎麼跑」（SSOT、業務鏈、cascade 規則）

---

## 首頁：登入分流

登入帳號決定看到哪邊：

```
┌── Venturo 帳號 ────→ [[#平臺端]]（管所有租戶）
└── 租戶帳號（如 CORNER）─── [[#租戶端]]（旅行社員工視角）
```

兩邊功能不重疊、是兩個獨立 web app 視角。

---

## 平臺端

漫途自己用、管整個系統商（跨租戶層級）。

### 主要分支

- [[platform/tenant-management|租戶管理]] ⭐ SSOT — 控制每個租戶能用什麼功能（`workspace_features`）

> 2026-05-03 William 拍板：以下原規劃全部移除、不做：
> - ~~計費 / 訂閱~~（線下處理、code 不做）
> - ~~AI Agent 工廠~~（移除）
> - ~~系統監控~~（不需要）
> - ~~跨租戶報表~~（不需要）

### 影響範圍

平臺端的設定 → 決定租戶端能看到什麼：
- 開關某個租戶的某模組（例：給 CORNER 開「打卡」、不給「完整會計」）
- 對應 schema：`workspaces` / `workspace_features`

---

## 租戶端

旅行社員工登入後看到、實際做業務的地方。

### SSOT 三巨頭

#### 1. [[tenant/hr|人資]]（獨立 SSOT、橫向影響全局）

- 員工 / 角色 / 權限
- 打卡 / 請假 / 薪資
- 影響所有模組的「誰能看誰、誰能操作什麼」
- 對應 schema：`employees / role_capabilities / attendance / leave / payroll`

#### 2. [[tenant/tour|旅遊團]]（核心 SSOT、主業務鏈）

租戶端最核心的業務、所有功能都圍繞它展開。
詳見下方 [[#旅遊團主鏈]]。

#### 3. [[tenant/finance|財務端]]（被旅遊團觸發、向下扇出）

- 請款 / 會計傳票 / 出納
- 從旅遊團「結案」階段觸發、回寫旅遊團狀態

### 串接的外部 SSOT

- [[tenant/attractions|景點資料庫]] — 外掛式、跨團共用、串行程設計
- [[tenant/airports|機場 / 航班]] — 行程欄位的固定 SSOT 核心

---

## 旅遊團主鏈（租戶端核心流程）

從建團到結案的鏈條、每一步都吃 SSOT、變動會 cascade：

```
[出團號] → [行程設計] → [簡易行程表] → [報價單] → [需求單] → [確認單] → [領隊交接] → [結案]
   ↓           ↓                          ↓                                    ↓
鎖日期/國家/   鎖區域+串景點            自動帶格式                       觸發財務 SSOT
   城市                              （日期/餐食/門票）
```

### 1. [[tour/code|出團號]]

格式：`{機場代號}{年}{月日}-{流水}`、例：`KIX260710-A`
- KIX = 大阪（機場代號）
- 26 = 2026
- 0710 = 7月10日
- -A = 第一團

→ 看到團號就知道是哪一團、能查重複。

帶出三個鎖定欄位：
- 日期
- 國家
- 城市

### 2. [[tour/itinerary|行程設計]]

吃日期 / 國家 / 城市的鎖定 → 自動篩可選範圍：
- 日本團不會跳出泰國行程
- 串 [[tenant/attractions|景點 SSOT 資料庫]]（外掛、跨團共用）

排好景點 / 飯店 / 餐廳 → 產出 [[tour/itinerary-simple|簡易行程表]]。

### 3. [[tour/quote|報價單]]

簡易行程表 → 存檔 → 自動產報價單。

自動帶格式：
- 日期（從旅遊團來）
- 餐食預設值
- 門票預設值

### 4. [[tour/request|需求單]]

報價單 → 進入需求階段：
- 訂房
- 訂餐廳
- 訂機票（航班 = 固定 SSOT 核心）

**Cascade 規則**：報價單欄位變動 → 需求單跟著動。
- 例：某景點不需門票、報價單隱藏 → 需求單也隱藏
- 業務不用重複詢問「要不要訂門票 / 要不要訂房」

### 5. [[tour/confirmation|確認單]]

需求單發出去（系統 / Email / 紙本）→ 供應商回傳 → 轉確認單。

### 6. [[tour/handoff|領隊交接]]

領隊出發前確認確認單內容 → 交接。

### 7. [[tour/closing|結案]]

觸發 [[tenant/finance|財務 SSOT]]：
- 請款（以單位為起點）
- 會計傳票
- 出納
- 回寫旅遊團狀態 = 結案

---

## SSOT 全景圖

| SSOT | 影響範圍 | 性質 |
|---|---|---|
| 旅遊團 | 整條主鏈 | 主鏈中心 |
| 景點資料庫 | 行程設計 | 獨立、外掛 |
| 航班 / 機場 | 行程 + 需求單 | 獨立、固定 |
| 財務端 | 結案、被旅遊團觸發 | 半獨立 |
| 人資 | 全局權限 | 完全獨立 |
| 租戶管理 | 全局功能開關（在平臺端）| 完全獨立 |

---

## 已知整合（屬租戶端、嵌在旅行社內）

- [[integrations/epos|永豐 EPOS]] — 線上付款、屬租戶端、嵌在某間旅行社內
- [[integrations/airline|航空公司系統]] — 機票訂位、串需求單
- [[integrations/line|LINE]] — 客服 / 通知、跨租戶端

---

## 還沒掛上去的模組（review 時決定歸位）

從現有 `src/features/` 撈出、目前未在心智圖中明確分類：

- CRM / customers — 客戶管理
- contracts — 合約
- visas — 簽證
- suppliers — 供應商
- todos — 待辦事項
- calendar — 行事曆
- tour-leaders — 領隊
- transportation-rates — 交通報價
- payments — 付款
- ai conversations — 客服對話

→ William review 時決定：保留 / 砍 / 歸到哪一支。

---

## 還沒寫進來的（未來逐步加）

- 資安規範（每個節點要的 RLS / capability check）
- 效能規範（讀取量、cache 策略、分頁）
- API 守門點對應
- 跟 brain 的概念對應（產品戰略、競品研究）

---

## 維護

- 本檔 = 系統地圖 SSOT、改架構先改這裡
- 每個 `[[link]]` 之後可建子檔展開（漸進、不一次建完）
- Obsidian Graph View 自動呈現節點關係
- review 後砍掉的舊架構在 git history 裡找得到（不會永久消失）
