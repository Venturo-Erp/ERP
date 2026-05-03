---
type: sitemap
status: draft
freshness: volatile
updated: 2026-05-03
summary: Venturo ERP 路由樹 — 站根分公開 / 登入兩支、(main) app 受 ModuleGuard 守門、平臺與租戶共用同一套 routes 靠 capability 切視野
related: CONCEPTS.md
---

# Venturo ERP — Sitemap（網站路由心智圖）

> 本檔是 ERP **真實路由樹**、從 `src/app/` 掃出來、一頁對一個節點。
> 業務流程 / SSOT 概念見 [[CONCEPTS]]。
>
> **看心智圖**：在 Obsidian 打開本檔、按 `Cmd+G` 開「局部關聯圖」、會看到 SITEMAP 為中心的放射樹。
> 一級節點目前有 stub、二級先列著、想展開時再加子檔。

---

## 站根分流

```
[/] 站根
│
├── 公開頁（不需登入）
│   ├── [[routes/landing|/landing]] — 落地頁
│   ├── [[routes/about|/about]] — 關於
│   ├── [[routes/confirm|/confirm/[token]]] — 邀請確認
│   ├── [[routes/public-tour|/p/tour/[code]]] — 公開團頁（給客戶看）
│   ├── [[routes/contract-sign|/public/contract/sign/[code]]] — 公開合約簽署
│   └── [[routes/view|/view/[id]]] — 公開檢視（用途待釐清）
│
└── [[routes/login|/login]] — 登入頁（單一進入點）
       ↓ 登入成功
       ├── Venturo 帳號 → (main) app + 平臺端視野（capability 控）
       └── 租戶帳號（CORNER 等）→ (main) app + 租戶端視野（capability 控）
```

**關鍵**：平臺端 / 租戶端 **共用同一套 (main) 路由**、靠 capability 切視野。沒有獨立 /admin 路徑。

例：
- `/tenants` 兩種帳號都看得到、平臺端 capability 給「全租戶 CRUD」、租戶端只給「看自己」
- `/hr` 兩種都看、平臺端可看跨租戶、租戶端只看自己

---

## (main) — 登入後主 app

由 `src/app/(main)/layout.tsx` 包 `ModuleGuard` 守門。

### 入口

- [[routes/dashboard|/dashboard]] — 儀表板（登入後預設）
- [[routes/unauthorized|/unauthorized]] — 沒權限頁

### 旅遊團 SSOT 鏈

- [[routes/tours|/tours]] → `/tours/[code]`（團詳細頁）
  - 團詳細頁可能嵌：行程設計 / 報價 / 需求 / 確認 / 結案（具體子頁實作待釐清）
- [[routes/orders|/orders]] — 訂單
- [[routes/customers|/customers]] → `/customers/companies`
- [[routes/visas|/visas]] — 簽證

### 財務

- [[routes/finance|/finance]]
  - `/finance/payments` — 付款
  - `/finance/requests` — 請款單
  - `/finance/settings` — 財務設定
  - `/finance/treasury` — 出納
    - `/finance/treasury/disbursement` — 出納單
  - `/finance/reports` — 報表
    - `/finance/reports/unpaid-orders` — 未收款訂單

### 會計

- [[routes/accounting|/accounting]]
  - `/accounting/accounts` — 會計科目
  - `/accounting/checks` — 票據
  - `/accounting/opening-balances` — 期初餘額
  - `/accounting/period-closing` — 期末結算
  - `/accounting/vouchers` — 傳票
  - `/accounting/reports` — 報表
    - `/accounting/reports/balance-sheet` — 資產負債表
    - `/accounting/reports/general-ledger` — 總帳
    - `/accounting/reports/income-statement` — 損益表
    - `/accounting/reports/trial-balance` — 試算表

### 人資

- [[routes/hr|/hr]]
  - `/hr/attendance` — 打卡
  - `/hr/leave` — 請假
  - `/hr/overtime` — 加班
  - `/hr/missed-clock` — 漏打卡
  - `/hr/deductions` — 扣項
  - `/hr/payroll` → `/hr/payroll/[id]` — 薪資 / 薪資單
  - `/hr/roles` — 角色 / 權限
  - `/hr/reports` — 人資報表
  - `/hr/settings` — 人資設定
- [[routes/payslip|/payslip]] — 員工查看自己薪資

### 外部資料庫（外掛 SSOT 維護）

- [[routes/database|/database]]
  - `/database/attractions` — 景點
  - `/database/suppliers` — 供應商
  - `/database/tour-leaders` — 領隊
  - `/database/transportation-rates` — 交通報價
  - `/database/archive-management` — 封存管理

### CIS（漫途自家服務）

- [[routes/cis|/cis]] → `/cis/[id]`
  - `/cis/pricing` — CIS 報價

### 平臺管理（capability 給平臺角色）

- [[routes/tenants|/tenants]] → `/tenants/[id]` — 租戶管理

### 通用

- [[routes/todos|/todos]] — 待辦
- [[routes/calendar|/calendar]] — 行事曆
- [[routes/settings|/settings]] → `/settings/company` — 設定 / 公司設定

---

## 平臺端規劃決議（2026-05-03 William 拍板）

原 CONCEPTS 規劃的 4 大平臺支柱、決定**全部不做**：

- ~~AI Agent 工廠~~ — 移除
- ~~計費 / 訂閱~~ — 線下處理、code 不做
- ~~系統監控~~ — 不需要
- ~~跨租戶報表~~ — 不需要

平臺端只留 [[routes/tenants|/tenants]] 租戶管理。

---

## 維護

- 本檔 = 路由 sitemap SSOT、新增 / 改 / 砍頁面先改這裡
- 每個 `[[routes/xxx]]` 對應 `docs/routes/xxx.md` stub、可漸進填內容
- `src/app/` 新增 page.tsx → 同步加這裡
- 看心智圖：在本檔按 `Cmd+G` 開「局部關聯圖」
