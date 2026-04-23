# 跨公司需求單系統 - 完整 TODO

> 建立日期：2026-01-11
> 狀態：規劃中

---

## 概述

建立完整的跨公司需求單系統，讓：

1. 旅行社可以發需求單給供應商（車行、領隊公司等）
2. 供應商登入同一系統，看到不同的介面
3. 供應商回覆派車/派人後，資料同步到旅客 APP
4. 旅客在 APP 看到自己的專車/領隊資訊

---

## Phase 1：資料表結構 ✅ 已完成

- [x] `workspaces.type` - 區分公司類型（travel_agency / vehicle_supplier / guide_supplier）
- [x] `tour_requests.recipient_workspace_id` - 需求單指定接收公司
- [x] `tour_requests.response_status` - 回覆狀態
- [x] `request_responses` - 供應商回覆主表
- [x] `request_response_items` - 回覆的資源明細（車輛/領隊）
- [x] `leader_availability` - 領隊可用檔期
- [x] RLS 政策設定

---

## Phase 2：領隊檔期管理

### 2.1 領隊頁面 UI 調整

- [ ] 在領隊管理頁面新增「檔期」區塊
- [ ] 新增檔期按鈕（開始日期、結束日期、狀態、備註）
- [ ] 檔期列表顯示（可編輯/刪除）
- [ ] 檔期狀態：available / tentative / blocked

### 2.2 領隊檔期 Store

- [ ] 建立 `leader-availability-store.ts`
- [ ] CRUD 操作
- [ ] 依日期範圍查詢可用領隊

### 2.3 調度頁面整合

- [ ] 點選日期時，右側面板顯示該日期有檔期的領隊
- [ ] 分配時驗證日期是否吻合
- [ ] 日期不符顯示警告

---

## Phase 3：需求單跨公司發送

### 3.1 需求單表單調整

- [ ] 新增「指定供應商」下拉選單
- [ ] 從 suppliers 表或 workspaces 表選擇
- [ ] 發送時設定 `recipient_workspace_id`

### 3.2 需求單列表調整

- [ ] 顯示「已發送給」欄位
- [ ] 顯示回覆狀態（待回覆/已回覆/已接受/已拒絕）
- [ ] 篩選：我發出的 / 我收到的

### 3.3 需求單詳情

- [ ] 顯示供應商回覆內容
- [ ] 回覆的車輛/領隊明細
- [ ] 接受/拒絕回覆按鈕

---

## Phase 4：供應商 Workspace 設定

### 4.1 建立測試供應商

- [ ] 建立「以琳車行」workspace（type: vehicle_supplier）
- [ ] 建立「宏福車隊」workspace（type: vehicle_supplier）
- [ ] 建立測試帳號綁定到這些 workspace

### 4.2 Workspace 類型管理

- [ ] Super 系統主管 可設定 workspace 類型
- [ ] 不同類型顯示不同功能選單

---

## Phase 5：供應商介面

### 5.1 供應商首頁/Dashboard

- [ ] 簡化版首頁，只顯示相關功能
- [ ] 待處理需求數量
- [ ] 近期派車/派人統計

### 5.2 需求收件匣

- [ ] 列出所有收到的需求單
- [ ] 依狀態篩選（待回覆/已回覆）
- [ ] 依日期篩選

### 5.3 需求回覆介面

- [ ] 查看需求詳情（專案名稱、日期、數量）
- [ ] 新增回覆（可加多個車輛/領隊）
- [ ] 每個資源填寫：名稱、車牌、司機、電話、可用日期、報價
- [ ] 送出回覆

### 5.4 供應商自己的車隊/人員庫存

- [ ] 車輛管理頁面（車牌、車型、座位數、司機）
- [ ] 派車行事曆（哪台車哪天被派出去）
- [ ] 庫存查詢（某日期有哪些車可用）

### 5.5 供應商請款功能

- [ ] 從已完成的需求單產生請款單
- [ ] 多選需求單批次請款
- [ ] 請款單管理（草稿/已送出/已收款）

---

## Phase 6：調度頁面重構

### 6.1 庫存面板改為「可用資源」

- [ ] 車輛：顯示供應商回覆的可用車輛
- [ ] 領隊：顯示有檔期的領隊
- [ ] 依選擇的日期過濾

### 6.2 分配流程

- [ ] 點選需求列 → 右側顯示可分配資源
- [ ] 拖拉或點選分配
- [ ] 日期不完全吻合時警告
- [ ] 分配後更新狀態

### 6.3 視覺化改善

- [ ] 已分配的需求顯示資源名稱
- [ ] 衝突標示（同一資源重複分配）
- [ ] 顏色區分狀態

---

## Phase 7：資料同步到旅客 APP

### 7.1 同步機制

- [ ] 供應商回覆被接受後，觸發同步
- [ ] 同步到 `traveler_tour_cache` 或新表
- [ ] 包含：車牌、司機、電話、接送資訊

### 7.2 venturo-online 資料表

- [ ] 建立 `traveler_trip_vehicles` 表
  - trip_id
  - vehicle_name / vehicle_type
  - license_plate
  - driver_name / driver_phone
  - pickup_location / pickup_time
  - supplier_name / supplier_phone
  - status

### 7.3 venturo-online API

- [ ] `GET /api/trips/[tripId]/vehicles` - 取得行程車輛
- [ ] 整合到現有 trip 資料流

### 7.4 venturo-online UI

- [ ] 建立 `VehicleInfoCard` 組件
- [ ] 在 `/orders/[id]/flight` 頁面新增「交通」Tab
- [ ] 顯示車輛資訊：車型、車牌、司機、電話
- [ ] 顯示接送資訊：時間、地點

---

## Phase 8：通知系統

### 8.1 ERP 端通知

- [ ] 新需求單 → 通知供應商
- [ ] 供應商回覆 → 通知發送方
- [ ] 回覆被接受/拒絕 → 通知供應商

### 8.2 旅客 APP 通知

- [ ] 車輛資訊更新 → 通知旅客
- [ ] 司機/時間變更 → 通知旅客

---

## Phase 9：報表與統計

### 9.1 供應商統計

- [ ] 供應商回覆率
- [ ] 平均回覆時間
- [ ] 歷史合作次數

### 9.2 調度統計

- [ ] 資源使用率
- [ ] 未分配需求數
- [ ] 日期熱度圖

---

## 技術備註

### 資料表關係

```
workspaces (type: travel_agency / vehicle_supplier)
    │
    ├── tour_requests ─────────────────────┐
    │   └── recipient_workspace_id ────────┼──► 供應商 workspace
    │                                      │
    │                              request_responses
    │                                      │
    │                              request_response_items
    │
    ├── fleet_vehicles (供應商的車隊)
    │
    ├── tour_leaders
    │       └── leader_availability (檔期)
    │
    └── leader_schedules (已分配)

venturo-online:
    traveler_trips
        └── traveler_trip_vehicles (從 ERP 同步)
```

### 權限控制

- 旅行社：完整功能
- 車行供應商：需求收件 + 車隊管理 + 請款
- 領隊供應商：需求收件 + 人員管理 + 請款
- 旅客：只看自己的行程資訊

### 同步時機

- ERP 接受供應商回覆 → 觸發同步到 online
- 使用 Supabase trigger 或 API webhook

---

## 優先順序建議

1. **Phase 2** - 領隊檔期（內部功能，不依賴外部）
2. **Phase 4** - 建立測試供應商帳號
3. **Phase 5.2-5.3** - 供應商收需求/回覆（核心流程）
4. **Phase 3** - 需求單跨公司發送
5. **Phase 6** - 調度頁面重構
6. **Phase 7** - 同步到旅客 APP
7. **其他** - 依需求排序

---

## 更新記錄

| 日期       | 更新內容                       |
| ---------- | ------------------------------ |
| 2026-01-11 | 初版建立，Phase 1 資料表已完成 |
