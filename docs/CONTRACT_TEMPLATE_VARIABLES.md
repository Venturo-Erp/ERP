# 旅遊契約範本變數對照表

此文件記錄了三個契約範本中使用的所有變數標記。

## 變數說明

所有變數使用 Mustache 格式：`{{variableName}}`

## 1. individual_international.html（國外個別旅遊契約）

### 基本資訊

| 變數名稱          | 說明                 | 範例值 |
| ----------------- | -------------------- | ------ |
| `{{reviewYear}}`  | 契約審閱年份（民國） | `113`  |
| `{{reviewMonth}}` | 契約審閱月份         | `11`   |
| `{{reviewDay}}`   | 契約審閱日           | `12`   |

### 旅客資訊（甲方）

| 變數名稱               | 說明           | 範例值            |
| ---------------------- | -------------- | ----------------- |
| `{{travelerName}}`     | 旅客姓名       | `王小明`          |
| `{{travelerAddress}}`  | 旅客住址       | `台北市大安區...` |
| `{{travelerIdNumber}}` | 旅客身分證字號 | `A123456789`      |
| `{{travelerPhone}}`    | 旅客電話       | `0912-345-678`    |

### 集合資訊

| 變數名稱           | 說明             | 範例值 |
| ------------------ | ---------------- | ------ |
| `{{gatherYear}}`   | 集合年份（民國） | `113`  |
| `{{gatherMonth}}`  | 集合月份         | `12`   |
| `{{gatherDay}}`    | 集合日           | `15`   |
| `{{gatherHour}}`   | 集合時           | `08`   |
| `{{gatherMinute}}` | 集合分           | `30`   |

### 費用資訊

| 變數名稱            | 說明                   | 範例值   |
| ------------------- | ---------------------- | -------- |
| `{{totalAmount}}`   | 旅遊費用總額（新台幣） | `50,000` |
| `{{depositAmount}}` | 定金金額（新台幣）     | `10,000` |

---

## 2. domestic.html（國內旅遊契約）

### 基本資訊

| 變數名稱          | 說明                 | 範例值 |
| ----------------- | -------------------- | ------ |
| `{{reviewYear}}`  | 契約審閱年份（民國） | `113`  |
| `{{reviewMonth}}` | 契約審閱月份         | `11`   |
| `{{reviewDay}}`   | 契約審閱日           | `12`   |

### 旅客資訊（甲方）

| 變數名稱              | 說明       | 範例值            |
| --------------------- | ---------- | ----------------- |
| `{{travelerName}}`    | 旅客姓名   | `王小明`          |
| `{{travelerPhone}}`   | 旅客電話   | `0912-345-678`    |
| `{{travelerAddress}}` | 旅客居住所 | `台北市大安區...` |

### 緊急聯絡人

| 變數名稱                    | 說明           | 範例值         |
| --------------------------- | -------------- | -------------- |
| `{{emergencyContactName}}`  | 緊急聯絡人姓名 | `王大明`       |
| `{{emergencyContactPhone}}` | 緊急聯絡人電話 | `0922-111-222` |

### 旅遊資訊

| 變數名稱              | 說明       | 範例值               |
| --------------------- | ---------- | -------------------- |
| `{{tourName}}`        | 旅遊團名稱 | `阿里山日月潭三日遊` |
| `{{tourDestination}}` | 旅遊地區   | `阿里山、日月潭`     |

### 集合資訊

| 變數名稱             | 說明             | 範例值             |
| -------------------- | ---------------- | ------------------ |
| `{{gatherYear}}`     | 集合年份（民國） | `113`              |
| `{{gatherMonth}}`    | 集合月份         | `12`               |
| `{{gatherDay}}`      | 集合日           | `15`               |
| `{{gatherHour}}`     | 集合時           | `08`               |
| `{{gatherMinute}}`   | 集合分           | `30`               |
| `{{gatherLocation}}` | 集合地點         | `台北火車站東三門` |

---

## 3. international.html（國外團體旅遊契約）

變數列表與 `domestic.html` 相同。

---

## 使用範例

### JavaScript 範例（使用 Mustache.js）

```javascript
import Mustache from 'mustache'
import fs from 'fs'

// 讀取範本
const template = fs.readFileSync('public/contract-templates/domestic.html', 'utf-8')

// 準備資料
const data = {
  reviewYear: '113',
  reviewMonth: '11',
  reviewDay: '12',
  travelerName: '王小明',
  travelerPhone: '0912-345-678',
  travelerAddress: '台北市大安區復興南路二段123號',
  emergencyContactName: '王大明',
  emergencyContactPhone: '0922-111-222',
  tourName: '阿里山日月潭三日遊',
  tourDestination: '阿里山、日月潭',
  gatherYear: '113',
  gatherMonth: '12',
  gatherDay: '15',
  gatherHour: '08',
  gatherMinute: '30',
  gatherLocation: '台北火車站東三門',
}

// 渲染
const html = Mustache.render(template, data)

// 儲存或輸出
fs.writeFileSync('output/contract.html', html)
```

### TypeScript 範例（使用簡單替換）

```typescript
function renderContract(template: string, data: Record<string, string>): string {
  let result = template

  for (const [key, value] of Object.entries(data)) {
    const pattern = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(pattern, value)
  }

  return result
}

// 使用
const template = await fs.readFile(
  'public/contract-templates/individual_international.html',
  'utf-8'
)
const rendered = renderContract(template, {
  reviewYear: '113',
  reviewMonth: '11',
  reviewDay: '12',
  travelerName: '李小華',
  travelerAddress: '新北市板橋區文化路一段456號',
  travelerIdNumber: 'B234567890',
  travelerPhone: '02-2345-6789',
  gatherYear: '114',
  gatherMonth: '01',
  gatherDay: '10',
  gatherHour: '10',
  gatherMinute: '00',
  totalAmount: '85,000',
  depositAmount: '20,000',
})
```

---

## 注意事項

1. **日期格式**：年份使用民國年，需要從西元年轉換（西元年 - 1911）
2. **金額格式**：建議使用千分位逗號分隔，例如 `50,000`
3. **時間格式**：小時和分鐘建議補零，例如 `08:30`
4. **空值處理**：如果某個欄位沒有資料，可以留空或使用底線 `_______`
5. **HTML 特殊字元**：如果資料中包含 `<`、`>`、`&` 等 HTML 特殊字元，需要進行轉義

---

## 修改歷史

- **2025-11-12**：初始版本，為三個契約範本加入變數標記
  - individual_international.html: 14 個變數
  - domestic.html: 16 個變數
  - international.html: 16 個變數
