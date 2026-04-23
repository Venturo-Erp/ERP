# Wave 2 前置：權限守衛盤點

**產出時間**：2026-04-21 00:30
**目標**：為 Wave 2 準備「哪些頁要擋、擋什麼」的清單

---

## 現況

| 類別 | 頁數 |
|--|--|
| 候選頁（finance / settings / hr / tools） | **31** |
| 有 guard（hardcode isAdmin 或其他檢查） | **5** |
| 完全沒 guard | **26** |

### 5 頁有 guard（但都 hardcode `isAdmin`）
```
settings/company         isAdmin redirect
hr/missed-clock          isAdmin 查自己 or 全部
hr/overtime              同上
hr/roles                 isAdmin redirect
tools/reset-db           isAdmin redirect（Wave 0 剛補）
```

Wave 2 要把這 5 頁的 `isAdmin` 換成 `canRead/canWrite('module', 'tab')`。

### 26 頁完全沒 guard

**🔴 高風險（財務、法律責任）**：
```
finance/payments           收款管理
finance/reports            財務報表
finance/requests           請款管理
finance/settings           財務設定
finance/travel-invoice     代轉發票（會真呼叫藍新）
finance/treasury           金庫（公帳 / 現金）
```

**🟡 中風險（設定類、多租戶）**：
```
settings/appearance        外觀（個人、可開放）
settings/bot-line          LINE bot 設定
settings/menu              選單（個人）
settings/modules           模組開關（系統主管 only）
settings/receipt-test      收據測試
settings/workspaces        工作空間（系統主管 only）
```

**🟡 HR 類（個人資料）**：
```
hr/announcements / hr/attendance / hr/clock-in
hr/deductions / hr/leave / hr/my-attendance
hr/my-leave / hr/my-payslip / hr/payroll
hr/reports / hr/settings / hr/training
```

**🟢 工具類**：
```
tools/flight-itinerary / tools/hotel-voucher
```

---

## permission key 現況（DB `role_tab_permissions` 表）

查了現有 key（按 module 分組）：
- `accounting.accounts / checks / opening-balances / period-closing / reports / vouchers`
- `accounting`（整個模組）
- `calendar`（整個模組、13 roles 有權限）
- `channel` / `customers` / 其他...

**總結**：key schema 已成形、follow `module_code` + `tab_code`（可 null 代表整模組）。

---

## Wave 2 建議 permission key 清單（給 William 審）

### Finance（高優先）
```
finance.payments          — 收款管理
finance.requests          — 請款管理
finance.travel-invoice    — 代轉發票（寫權限 = 能按批次開立 = 法律責任）
finance.reports           — 財務報表
finance.settings          — 財務設定（系統主管）
finance.treasury          — 金庫（系統主管 或 finance manager）
```

### Settings（系統主管 為主）
```
settings.company          — 公司資料（系統主管）
settings.modules          — 模組開關（系統主管）
settings.workspaces       — 工作空間（系統主管）
settings.bot-line         — LINE bot 設定（系統主管）
settings.appearance       — 個人外觀（全員）
settings.menu             — 個人選單（全員）
settings.receipt-test     — 測試工具（系統主管）
```

### HR
```
hr.roles                  — 職務管理（系統主管）
hr.payroll                — 薪資管理（系統主管 / HR manager）
hr.deductions             — 扣款（系統主管 / HR）
hr.reports                — 人資報表（系統主管 / HR）
hr.settings               — HR 設定（系統主管）
hr.announcements          — 公告（系統主管 / HR）
hr.attendance             — 打卡紀錄（全員看自己、系統主管看全部）
hr.my-attendance          — 個人打卡（全員）
hr.my-leave               — 個人請假（全員）
hr.my-payslip             — 個人薪資（全員）
hr.leave                  — 請假管理（系統主管 / HR 審）
hr.overtime               — 加班（全員申請、系統主管 審）
hr.missed-clock           — 漏刷卡（全員申請、系統主管 審）
hr.clock-in               — 打卡按鈕（全員）
hr.training               — 訓練（全員）
```

### Tools
```
tools.reset-db            — 重置本機 DB（admin、Wave 0 已加 isAdmin）
tools.flight-itinerary    — 航班行程工具（全員）
tools.hotel-voucher       — 住宿憑證工具（全員）
```

---

## 📋 給 William 的決策點

1. **上面的 key 清單 OK 嗎**？有要加/減的嗎？
2. **個人頁 vs 管理頁分離**（my-* / 非 my-*）OK 嗎？
3. **tour_leader scope 邏輯**：員工 → full、客戶 → self_only、細節先放 Wave 2 後期？

---

## Wave 2 執行計畫（William 審完 key 後）

1. 在 DB `role_tab_permissions` 表補齊缺的 key（seed migration）
2. 每頁加一個 HOC 或 early return：
   ```tsx
   const { canRead } = useTabPermissions()
   if (!canRead('finance', 'travel-invoice')) return <Unauthorized />
   ```
3. 原本的 `isAdmin` hardcode 換成 key-based
4. 系統主管 後台 UI 可勾每個 role 能看哪些 key（若 UI 還沒做、先用 SQL 設）
5. E2E 測試：不同 role 登入、確認擋/放正確

工期：M-L（26 頁逐一加 guard、但 pattern 一致、快）
