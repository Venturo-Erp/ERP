# Venturo ERP 全網站盤查 2026-04-26

**全頁面數**：52 條（不含 API）
**Sitemap 已寫**：4 / 52 條（7%）
**Blueprint 已寫**：5 條（編號制）

---

## 🏠 主入口

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/dashboard` | ❌ | ✅ 02-dashboard.md | 🔴 入口、必驗 |
| `/landing` | ❌ | ❌ | 🟢 一般 |
| `/page.tsx` | ❌ | ❌ | 🟢 一般 |
| `/login` | ✅ login.md | ✅ 01-login.md | 🔴 入口、必驗 |
| `/unauthorized` | ❌ | ❌ | 🟢 一般 |
| `/about` | ❌ | ❌ | 🟢 一般 |

## 🧳 旅遊團

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/tours` | ✅ tours.md | ❌ | 🔴 業務每日 |
| `/orders` | ❌ | ❌ | 🔴 業務每日 |
| `/visas` | ❌ | ❌ | 🟢 一般 |
| `/calendar` | ❌ | ❌ | 🟢 一般 |

## 💰 財務

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/finance` | ❌ | ❌ | 🟢 一般 |
| `/finance/payments` | ✅ finance_payments.md | ❌ | 🔴 業務每日 |
| `/finance/requests` | ❌ | ❌ | 🔴 業務每日 |
| `/finance/treasury` | ❌ | ❌ | 🟢 一般 |
| `/finance/treasury/disbursement` | ❌ | ❌ | 🟢 一般 |
| `/finance/reports` | ❌ | ❌ | 🟢 一般 |
| `/finance/reports/unpaid-orders` | ❌ | ❌ | 🔴 業務每日 |
| `/finance/settings` | ❌ | ❌ | 🟡 後台、不常動 |

## 📒 會計

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/accounting/accounts` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/checks` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/period-closing` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/reports/balance-sheet` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/reports/general-ledger` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/reports/income-statement` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/reports` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/reports/trial-balance` | ❌ | ❌ | 🟡 會計專用 |
| `/accounting/vouchers` | ❌ | ❌ | 🟡 會計專用 |

## 👥 客戶

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/customers` | ❌ | ❌ | 🟢 一般 |
| `/customers/companies` | ❌ | ❌ | 🟢 一般 |

## 📚 資料庫

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/database/archive-management` | ❌ | ❌ | 🟢 字典資料 |
| `/database/attractions` | ❌ | ❌ | 🟢 字典資料 |
| `/database` | ❌ | ❌ | 🟢 字典資料 |
| `/database/suppliers` | ❌ | ❌ | 🟢 字典資料 |
| `/database/tour-leaders` | ❌ | ❌ | 🟢 字典資料 |
| `/database/transportation-rates` | ❌ | ❌ | 🟢 字典資料 |

## 👤 HR + 設定

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/hr` | ✅ hr.md | ✅ 16-hr-roles.md | 🟡 後台、不常動 |
| `/hr/roles` | ✅ hr.md | ✅ 16-hr-roles.md | 🟡 後台、不常動 |
| `/hr/settings` | ✅ hr.md | ✅ 16-hr-roles.md | 🟡 後台、不常動 |
| `/settings` | ❌ | ❌ | 🟡 後台、不常動 |
| `/settings/company` | ❌ | ❌ | 🟡 後台、不常動 |
| `/tenants` | ❌ | ❌ | 🟡 後台、不常動 |
| `/tenants/[id]` | ❌ | ❌ | 🟡 後台、不常動 |

## 🛠 工具

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/todos` | ❌ | ❌ | 🟢 一般 |
| `/channel` | ❌ | ❌ | 🟢 一般 |
| `/ai-bot` | ❌ | ❌ | 🟢 一般 |

## 🌐 公開 / 對外

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/p/tour/[code]` | ❌ | ❌ | 🟡 對外、要乾淨 |
| `/contract/sign/[code]` | ❌ | ❌ | 🟡 對外、要乾淨 |
| `/insurance/[code]` | ❌ | ❌ | 🟡 對外、要乾淨 |

## 🔗 確認連結

| 路由 | Sitemap | Blueprint | 優先級 |
|---|---|---|---|
| `/confirm/[token]` | ❌ | ❌ | 🟢 一般 |
| `/transport/[id]/confirm` | ❌ | ❌ | 🟢 一般 |
| `/view/[id]` | ❌ | ❌ | 🟢 一般 |

## 🤷 未分類

- `/tours/[code]`

---

## 📋 待補 Sitemap 優先級（推薦補的順序）

**第一波（業務每日用、必補）**：
- `/orders` — 訂單列表（業務員每天）
- `/finance/requests` — 請款管理（4 tab 剛改、需 sitemap 寫業務目的）
- `/calendar` — 行事曆（老闆/業務每天看排程）
- `/customers` + `/customers/companies` — 客戶管理

**第二波（確認流程、客人看到）**：
- `/confirm/[token]` — 客人確認 token 頁
- `/transport/[id]/confirm` — 廠商確認
- `🌐 view/[id]` — 行程展示頁（客人看）
- `🌐 public/contract/sign/[code]` — 合約簽署
- `🌐 public/insurance/[code]` — 保險頁
- `🌐 (public)/p/tour/[code]` — 公開行程預覽

**第三波（會計 / 後台、上線前夠用就好）**：
- `/accounting/*` 8 條（vouchers / accounts / period-closing / reports）
- `/finance/treasury` + `/finance/treasury/disbursement`
- `/database/*` 5 條（attractions / suppliers / tour-leaders 等）

**第四波（很少動的後台、保留即可）**：
- `/settings` / `/settings/company` / `/tenants` / `/hr/settings`
- `/about` / `/landing`

---

## 🎯 建議行動

1. **補第一波 4 頁 sitemap**（業務每日用、最常踩雷）— 你口述 30 min
2. 第二波等實際發生 bug / cleanup 再補
3. 第三、四波可以自動用 venturo-page-build SOP 強迫產出（任何新動的頁、Step 0 就會寫 sitemap）
