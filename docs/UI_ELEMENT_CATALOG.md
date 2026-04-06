# UI 元素總表

> 最後更新：2026-04-05
> 用途：設計團隊參考、未來主題切換依據

---

## 按鈕總表

### Button 元件變體 (src/components/ui/button.tsx)

| variant     | 樣式                | 用途             | 出現次數(估) |
| ----------- | ------------------- | ---------------- | ------------ |
| outline     | 邊框 + 懸停淡化背景 | 取消、次要操作   | ~530         |
| ghost       | 無背景，懸停顯示    | 工具列、輔助操作 | ~330         |
| default     | 主色背景            | 主要操作         | ~13          |
| secondary   | 灰色背景            | 次要確認         | ~20          |
| destructive | morandi-red 背景    | 刪除、危險操作   | ~14          |
| link        | 純文字連結          | 內連結（未使用） | 0            |

### Button 尺寸

| size    | 規格       | 用途            |
| ------- | ---------- | --------------- |
| default | h-10 px-4  | 標準按鈕        |
| sm      | h-9 px-3   | 表格/對話框按鈕 |
| xs      | h-8 px-2.5 | 密集列表        |
| lg      | h-11 px-8  | 大型主操作      |
| icon    | 10×10      | 圖示按鈕        |
| iconSm  | 8×8        | 小型圖示按鈕    |

### ✅ 原生 button 已全數遷移 (2026-04-05)

以下檔案已從 `<button>` + `.btn-morandi-*` 遷移至 `<Button>` 元件：
CreateChannelDialog、CreateGroupDialog、ShareAdvanceDialog、ShareOrdersDialog、CreateReceiptDialog、AdvanceListCard、OrderListCard、m/todos

---

## 操作欄圖示標準 (ActionCell / Table Actions)

> 所有操作按鈕統一使用 **16px** 圖示，來自 lucide-react。

| 操作 | 統一圖示     | 色彩              | 備註                         |
| ---- | ------------ | ----------------- | ---------------------------- |
| 編輯 | **Edit2**    | morandi-gold      | ~~Pencil~~ 已棄用            |
| 刪除 | **Trash2**   | morandi-red       | ~~X~~ 僅用於關閉，不用於刪除 |
| 查看 | **Eye**      | morandi-green     | 預覽、檢視詳情               |
| 複製 | **Copy**     | morandi-gold      | 複製/重複                    |
| 列印 | **Printer**  | morandi-gold      | ~~FileText~~ 不再用於列印    |
| 下載 | **Download** | morandi-gold      | 下載檔案                     |
| 新增 | **Plus**     | —                 | 新增項目                     |
| 封存 | **Archive**  | morandi-secondary | 歸檔                         |
| 儲存 | **Save**     | —                 | 儲存變更                     |
| 取消 | **X**        | —                 | 關閉/取消操作                |

### ActionCell 元件 (src/components/table-cells/index.tsx)

```typescript
interface ActionButton {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
}
```

| variant | 文字色         | 懸停背景          |
| ------- | -------------- | ----------------- |
| default | morandi-gold   | morandi-gold/10   |
| danger  | morandi-red    | morandi-red/10    |
| success | morandi-green  | morandi-green/10  |
| warning | status-warning | status-warning-bg |

### ⚠️ 禁止事項

- ❌ 用 `Pencil` 代替 `Edit2`
- ❌ 用 `X` 做刪除（`X` 只用於關閉/取消）
- ❌ 用 `FileText` 做列印（`FileText` 用於文件圖示）
- ❌ 操作按鈕用 14px 以外的 16px 統一尺寸

---

## 狀態標籤總表

### Badge 元件變體 (src/components/ui/badge.tsx)

| variant     | 背景               | 文字            | 用途        | 出現次數(估) |
| ----------- | ------------------ | --------------- | ----------- | ------------ |
| default     | morandi-primary    | white           | 活躍/已確認 | ~50          |
| secondary   | morandi-container  | morandi-primary | 次要狀態    | ~11          |
| outline     | transparent + 邊框 | morandi-primary | 草稿/未激活 | ~24          |
| destructive | morandi-red        | white           | 錯誤/已取消 | ~3           |

### 集中狀態配置 (lib/status-config.ts)

| 狀態      | 顏色            | 標籤   | 圖示        |
| --------- | --------------- | ------ | ----------- |
| pending   | morandi-gold    | 待確認 | Clock       |
| confirmed | morandi-green   | 已確認 | CheckCircle |
| completed | morandi-primary | 已完成 | FileCheck   |
| cancelled | morandi-red     | 已取消 | XCircle     |

### 其他狀態映射 (lib/constants/status-maps.ts)

| 系統               | 主要狀態                                           |
| ------------------ | -------------------------------------------------- |
| TOUR_STATUS        | 開團、待出發、已結團、取消                         |
| ORDER_STATUS_MAP   | 待確認、已確認、已完成、已取消                     |
| PAYMENT_STATUS_MAP | 未收款、部分收款、已收款、已退款                   |
| QUOTE_STATUS_MAP   | 草稿、開團、修改中、待出發、已核准、已轉單、已拒絕 |

### Morandi 色彩使用統計

| 顏色              | 使用次數 | 語意           |
| ----------------- | -------- | -------------- |
| morandi-gold      | ~2868    | 主強調、待確認 |
| morandi-secondary | ~2502    | 次要文字       |
| morandi-primary   | ~2336    | 主文字、已完成 |
| morandi-container | ~1144    | 背景容器       |
| morandi-red       | ~616     | 錯誤、取消     |
| morandi-green     | ~584     | 成功、確認     |
| morandi-muted     | ~556     | 禁用           |

---

## 圖示總表 (lucide-react)

### Top 30 最常用

| #   | 圖示          | 檔案數 | 主要用途       |
| --- | ------------- | ------ | -------------- |
| 1   | X             | 162    | 關閉、刪除標記 |
| 2   | Loader2       | 107    | 載入動畫       |
| 3   | Plus          | 104    | 新增           |
| 4   | Trash2        | 83     | 刪除           |
| 5   | Check         | 75     | 確認勾選       |
| 6   | FileText      | 50     | 文件/票據      |
| 7   | MapPin        | 45     | 地點           |
| 8   | AlertCircle   | 40     | 警告           |
| 9   | Calendar      | 40     | 日期           |
| 10  | ChevronRight  | 40     | 導航展開       |
| 11  | Search        | 40     | 搜尋           |
| 12  | Building2     | 37     | 飯店/公司      |
| 13  | Users         | 36     | 人員           |
| 14  | Save          | 36     | 儲存           |
| 15  | ChevronDown   | 31     | 下拉           |
| 16  | Printer       | 31     | 列印           |
| 17  | Plane         | 28     | 航班           |
| 18  | Upload        | 27     | 上傳           |
| 19  | AlertTriangle | 22     | 注意           |
| 20  | Edit2         | 22     | 編輯           |
| 21  | User          | 21     | 個人帳戶       |
| 22  | Eye           | 21     | 預覽           |
| 23  | Clock         | 21     | 時間/待確認    |
| 24  | GripVertical  | 18     | 拖曳排序       |
| 25  | RefreshCw     | 17     | 刷新           |
| 26  | DollarSign    | 16     | 金額           |
| 27  | Sparkles      | 16     | AI 功能        |
| 28  | ChevronLeft   | 16     | 返回           |
| 29  | Pencil        | 15     | 編輯           |
| 30  | Bus           | 15     | 交通           |

### 中頻 (5-14 次)

Copy, CheckCircle, Star, ImageIcon, Download, Send, Image, CheckCircle2, Phone, ArrowRight, ArrowLeft, TrendingUp, Settings, ExternalLink, Receipt, UtensilsCrossed, Hotel, Mail, RotateCcw, EyeOff, Calculator, Globe, BookOpen, ChevronUp, UserPlus, Utensils, TrendingDown, Edit, XCircle, FileSpreadsheet, Shield, Lock, Archive, ClipboardList, Palette, MessageCircle, CreditCard, Info, MessageSquare, Bot

### 低頻 (1-4 次)

FileImage, Filter, Building, Link2, Package, Inbox, FileDown, Layers, Cloud, Power, UserCheck, File, Briefcase, Ticket, Hash, FileSignature, ImageOff, Key, BarChart3, Database, Link, Cake, UserX, CheckSquare, List, Navigation, Share2, etc.

---

## 路由別元素清單

### `/customized-tours`

> 審計日期：2026-04-05 | 合規：100%

**按鈕**

| 元件   | variant | 文字 | 圖示           |
| ------ | ------- | ---- | -------------- |
| Button | ghost   | 新增 | Plus           |
| Button | ghost   | 編輯 | Edit           |
| Button | ghost   | 刪除 | Trash2         |
| Button | ghost   | 預覽 | Eye            |
| Button | ghost   | 連結 | LinkIcon       |
| Button | ghost   | 更多 | MoreHorizontal |
| Button | outline | —    | Sparkles       |
| Button | outline | —    | Globe          |
| Button | outline | —    | FileEdit       |

**圖示**

| 圖示名         | 大小 | 用途      |
| -------------- | ---- | --------- |
| MapPin         | 16px | 地點標示  |
| Plus           | 16px | 新增      |
| Edit           | 16px | 編輯      |
| Trash2         | 16px | 刪除      |
| Eye            | 16px | 預覽      |
| LinkIcon       | 16px | 連結      |
| MoreHorizontal | 16px | 更多選項  |
| Sparkles       | 16px | AI 功能   |
| Globe          | 16px | 網站/公開 |
| FileEdit       | 16px | 文件編輯  |
| GripVertical   | 16px | 拖曳排序  |

**標籤/Badge**

| 元件  | 文字     | 顏色/variant          |
| ----- | -------- | --------------------- |
| Badge | 狀態標籤 | variant prop (依狀態) |
| Badge | 已加入   | morandi-green         |

---

### `/customized-tours/[id]`

> 審計日期：2026-04-05 | 合規：100%

_(與 `/customized-tours` 共用元素，見上方)_

---

### `/inquiries`

> 審計日期：2026-04-05 | 合規：100%

**按鈕**

| 元件   | variant | size   | 圖示           |
| ------ | ------- | ------ | -------------- |
| Button | ghost   | iconSm | MoreHorizontal |
| Button | outline | —      | Eye, FileText  |
| Button | default | —      | —              |

**圖示**

| 圖示名         | 用途     |
| -------------- | -------- |
| Inbox          | 空狀態   |
| Phone          | 電話     |
| Mail           | 信箱     |
| Calendar       | 日期     |
| Users          | 人數     |
| MapPin         | 地點     |
| MoreHorizontal | 更多選項 |
| Eye            | 檢視     |
| FileText       | 文件     |
| CheckCircle    | 已確認   |
| XCircle        | 已取消   |
| Clock          | 待處理   |

**標籤/Badge**

| 元件  | 文字     | 顏色/variant           |
| ----- | -------- | ---------------------- |
| Badge | 動態狀態 | STATUS_CONFIG 色彩映射 |

---

### `/p/customized`

> 審計日期：2026-04-05 | 待修復 (2 violations)

**圖示**

| 圖示名 | 用途 |
| ------ | ---- |
| Globe  | 網站 |
| MapPin | 地點 |

---

### `/p/customized/[slug]`

> 審計日期：2026-04-05 | 待修復 (4 violations)

**按鈕**

| 元件   | variant | 圖示                           |
| ------ | ------- | ------------------------------ |
| Button | outline | ChevronLeft, Phone, Send, Copy |

**圖示**

| 圖示名      | 用途 |
| ----------- | ---- |
| Loader2     | 載入 |
| MapPin      | 地點 |
| ChevronLeft | 返回 |
| Phone       | 電話 |
| Check       | 確認 |
| X           | 關閉 |
| Send        | 送出 |
| CheckCircle | 成功 |
| Copy        | 複製 |

**標籤/Badge**

| 元件  | variant      |
| ----- | ------------ |
| Badge | outline (x2) |

---

### `/p/tour/[code]`

> 審計日期：2026-04-05 | 待修復 (29 violations)

**按鈕**

| 元件   | variant |
| ------ | ------- |
| Button | outline |

**圖示**

| 圖示名      | 用途 |
| ----------- | ---- |
| MapPin      | 地點 |
| Calendar    | 日期 |
| Users       | 人數 |
| Clock       | 時間 |
| Phone       | 電話 |
| Mail        | 信箱 |
| Utensils    | 餐食 |
| Hotel       | 住宿 |
| Camera      | 攝影 |
| Ship        | 船   |
| TreePine    | 戶外 |
| Building    | 建築 |
| Share2      | 分享 |
| Heart       | 收藏 |
| CheckCircle | 確認 |
| User        | 個人 |
