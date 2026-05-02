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
| 1 | `/customers` 顧客 | 中文(name) / 電話(phone) / 公司名(company) | ⏸️ 待改 |
| 2 | `/orders` 訂單 | 團號(code) / 團名(name) / 日期(departure_date) | ⏸️ 待改 |
| 3 | `/tours` 旅行團 | ❓ 待你拍板 | ⏸️ |
| 4 | `/finance` 財務 overview | ❓ | ⏸️ |
| 5 | `/finance/treasury` 出納 | ❓ | ⏸️ |
| 6 | `/finance/payments` 收款 | ❓ | ⏸️ |
| 7 | `/finance/requests` 請款 | ❓ | ⏸️ |
| 8 | `/database/attractions` 景點 | ❓ | ⏸️ |
| 9 | `/database/suppliers` 供應商 | ❓ | ⏸️ |
| 10 | `/database/tour-leaders` 領隊 | ❓ | ⏸️ |
| 11 | `/hr/employees` 員工 | ❓ | ⏸️ |
| 12 | `/visas` 簽證 | ❓ | ⏸️ |
| 13 | `/todos` 待辦 | （量小、可能不用）| ⏸️ |
| 14 | `/tenants` 租戶（VENTURO 平台用）| code / name | ⏸️ |

> 等 William 拍板剩餘 11 個列表頁的篩選欄位、再批次改。

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
