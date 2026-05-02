# 列表頁讀取量規範

> William 2026-05-02 拍板：未來 SaaS 化、Supabase 讀取量 = 直接成本。
> 列表頁不准一次載全部、要用篩選找特定資料。

---

## 鐵律

| 規則 | 為什麼 |
|---|---|
| ❌ **不准用 `useXxxList()` / `useXxx()` 載全部資料** | 1000 筆顧客 × 每次點頁面 = 大量讀取 |
| ✅ **必用 `useXxxPaginated()`** | 真正 server-side 分頁、只載 15 筆 |
| ✅ **固定每頁 15 筆**（已預設於 `useTableState`）| 統一、避免使用者選 100 筆 burn 讀取 |
| ✅ **不提供「每頁筆數」選擇器**（已從 `TablePagination` 拿掉）| 用 combo box / 放大鏡找特定資料、不靠翻頁 |

---

## 改造 pattern（從 useList → usePaginated）

### 改前
```tsx
const { items: customers } = useCustomers()  // ❌ 載全部
const filtered = useMemo(() => /* frontend filter */, [customers, search])
return <EnhancedTable data={filtered} />
```

### 改後
```tsx
const [page, setPage] = useState(1)
const [search, setSearch] = useState('')
const { items, totalCount, loading } = useCustomersPaginated({
  page,
  pageSize: 15,
  search,
  searchFields: ['name', 'phone', 'company'],  // William 拍板的 3 個篩選欄位
})
return (
  <PaginatedTable
    data={items}
    totalCount={totalCount}
    currentPage={page}
    onPageChange={setPage}
    onSearchChange={setSearch}
  />
)
```

> ⚠️ EnhancedTable 目前是 client-side 分頁（接收全部 data 自己 slice）。
> 改造列表頁前要先擴充 EnhancedTable 支援 controlled mode（接外部 page state）、
> 或寫獨立的 PaginatedTable component。

---

## 14 個列表頁清單 + 篩選欄位（William 拍板）

| # | 列表頁 | 篩選欄位 | 狀態 |
|---|---|---|---|
| 1 | `/customers` 顧客 | 姓名(name) / 電話(phone) / 公司名(company) | ✅ 完成（2026-05-02） |
| 2 | `/orders` 訂單 | 團號(code) / 團名(tour_name)、出團日(departure_date) 排序 | ✅ 完成（2026-05-02） |
| 3 | `/tours` 旅行團 | 團名(name) / 團號(code) / 地點(location) / 描述(description) | ✅ **本來就 server-side**（useToursPaginated）|
| 4 | `/finance/payments` 收款 | 收款單號 / 團名 / 收款日期 / **帳號後五碼**（核對對帳單用）| ⏸️ 待改 |
| 5 | `/finance/requests` 請款 | 請款單號 / 團名 / 請款日期 / 帳號後五碼 | ⏸️ 待改 |
| 6 | `/finance/treasury` 出納 | 出納單號 / 廠商名（出帳時間排序）| ⏸️ 待改 |
| 7 | `/database/attractions` 景點 | 景點名 / 城市 | ⏸️（agent 推測、待 William 確認）|
| 8 | `/database/suppliers` 供應商 | 供應商名 / 聯絡人 | ⏸️（同上）|
| 9 | `/database/tour-leaders` 領隊 | 姓名 / 員工編號 | ⏸️（同上）|
| 10 | `/hr/employees` 員工 | 姓名 / 員工編號 / 電話 | ⏸️（同上）|
| 11 | `/visas` 簽證 | 護照號 / 客戶姓名 / 團號 | ⏸️（同上）|
| 12 | `/todos` 待辦 | （量小、可能不用） | ⏸️ |
| 13 | `/tenants` 租戶（VENTURO 平台用）| code / name | ⏸️ |

### 帳號後五碼 — 技術註記

「帳號後五碼」搜尋是會計核對銀行對帳單時的常見需求（例：對帳單顯示款項從 `*****12345` 進來、要找 ERP 對應的收款單）。

**實作選項**：
- (a) `receipts` 表加 `bank_account_last5` 衍生欄位、trigger 從 `bank_accounts` 同步
- (b) 用 SQL view + cast、search 對 view 操作
- (c) 用 RPC 寫 custom search

待 William 確認方案後實作。

---

## 已做（基礎建設）

- ✅ `useTableState` `initialPageSize = 15`（已是預設）
- ✅ `TablePagination` 拿掉「每頁筆數」selector（2026-05-02 改）
- ✅ `useXxxPaginated` 在 `createEntityHook` 已支援、各 entity 已 export 或可 export

## 還沒做（基礎建設）

- ⏸️ EnhancedTable 加 controlled mode（接外部 page state、不在 component 內部 slice）
- ⏸️ PaginatedTable wrapper component（簡化 caller 程式碼）
- ⏸️ 14 個列表頁逐個改 caller

---

## 守門

未來加：
- `check-standards.sh` 加 check：列表頁用 `useXxx()` 而不是 `useXxxPaginated()` 警告
- pre-commit hook 同樣
