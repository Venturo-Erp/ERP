# Venturo 設計系統規範 (Design System Specification)

> 版本: 1.0 | 最後更新: 2025-12-02

---

## 📋 公司資訊

- **系統名稱**: Venturo (品牌視覺名稱: V CORNER)
- **系統類型**: 旅遊團管理系統 (Travel Tour Management System)
- **主要功能**: 訂單管理、報價單、合約、財務記帳、人資管理、行程管理
- **技術棧**: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + Supabase

---

## 🎨 設計風格核心理念

### 設計哲學：莫蘭迪色系 (Morandi Color Palette)

靈感來自義大利畫家 **喬治·莫蘭迪 (Giorgio Morandi)** 的靜物畫作。

- **低飽和度**：所有顏色都帶有灰調，給人沉穩、優雅的感覺
- **溫暖質感**：以米色、奶茶色、大地色為基調
- **柔和過渡**：避免高對比，強調視覺舒適度
- **精緻細膩**：細節處理如漸層、陰影都很講究

### 整體視覺感受

- 優雅、低調、專業
- 不張揚但有質感
- 適合長時間使用不疲勞
- 介於「高端奢侈品牌」與「親切日常」之間

---

## 🎨 色彩系統

### 淺色主題 (Light Theme - 預設)

```css
:root {
  /* === 主色系 === */
  --morandi-primary: #3a3633; /* 主要文字 - 深棕灰 */
  --morandi-secondary: #8b8680; /* 次要文字 - 暖灰 */
  --morandi-gold: #c9aa7c; /* 強調色/品牌色 - 奶茶金 */
  --morandi-gold-hover: #b8996b; /* 強調色 hover - 深奶茶金 */
  --morandi-green: #9fa68f; /* 成功/正面 - 橄欖灰綠 */
  --morandi-red: #c08374; /* 錯誤/警告 - 玫瑰灰紅 */
  --morandi-container: #e8e5e0; /* 容器背景 - 米灰 */
  --morandi-muted: #b8b2aa; /* 淡化文字 - 淺暖灰 */

  /* === 背景色 === */
  --background: #f6f4f1; /* 頁面背景 - 奶白 */
  --card: #ffffff; /* 卡片背景 - 純白 */
  --border: #d4c4b0; /* 邊框 - 奶茶邊框 */
  --accent: #e8e5e0; /* 強調背景 - 米灰 */

  /* === 表單元素 === */
  --input-border: #d4c4b0; /* 輸入框邊框 */
  --input-border-hover: #c4a572; /* hover 邊框 */
  --input-border-focus: #c4a572; /* focus 邊框 */
  --input-bg: #ffffff; /* 輸入框背景 */
  --input-text: #3a3633; /* 輸入框文字 */
  --input-placeholder: #b8b2aa; /* placeholder */
}
```

### 深色主題 (Dark Theme - Discord 風格)

```css
[data-theme='modern-dark'] {
  /* === 主色系 === */
  --morandi-primary: #dcddde; /* 主要文字 - 柔和白 */
  --morandi-secondary: #b9bbbe; /* 次要文字 - 灰白 */
  --morandi-gold: #5865f2; /* 強調色 - Discord 紫藍 */
  --morandi-gold-hover: #4752c4; /* 強調色 hover - 深紫藍 */
  --morandi-green: #3ba55d; /* 成功 - 柔和綠 */
  --morandi-red: #ed4245; /* 錯誤 - 柔和紅 */
  --morandi-container: #2f3136; /* 容器背景 - 深灰 */
  --morandi-muted: #72767d; /* 淡化文字 - 深灰 */

  /* === 背景色 === */
  --background: #36393f; /* 頁面背景 - 深灰帶藍 */
  --card: #2f3136; /* 卡片背景 - 更深灰 */
  --border: #202225; /* 邊框 - 深色 */
  --accent: #4f545c; /* 強調背景 - 較亮灰 */
}
```

---

## 🔤 字體系統

### 字體家族

```css
font-family: Arial, Helvetica, sans-serif;
```

### 字體大小規範

| 用途          | 大小            | 行高     | 字重           |
| ------------- | --------------- | -------- | -------------- |
| 頁面標題 (h1) | 1.5rem (24px)   | 2rem     | 600 (semibold) |
| 區塊標題 (h2) | 1.25rem (20px)  | 1.75rem  | 600            |
| 卡片標題 (h3) | 1rem (16px)     | 1.5rem   | 500 (medium)   |
| 正文          | 0.875rem (14px) | 1.25rem  | 400 (normal)   |
| 小字/標籤     | 0.75rem (12px)  | 1rem     | 400            |
| 極小字        | 0.625rem (10px) | 0.875rem | 400            |

### 文字顏色

```css
/* 主要文字 */
color: var(--morandi-primary); /* #3a3633 */

/* 次要文字 */
color: var(--morandi-secondary); /* #8b8680 */

/* 淡化文字 */
color: var(--morandi-muted); /* #b8b2aa */

/* 強調文字 (金色) */
color: var(--morandi-gold); /* #c9aa7c */
```

---

## 📐 間距系統

基於 4px 基準單位：

| Token | 值             | 用途     |
| ----- | -------------- | -------- |
| xs    | 4px (0.25rem)  | 極小間距 |
| sm    | 8px (0.5rem)   | 小間距   |
| md    | 12px (0.75rem) | 中間距   |
| base  | 16px (1rem)    | 基礎間距 |
| lg    | 24px (1.5rem)  | 大間距   |
| xl    | 32px (2rem)    | 超大間距 |
| 2xl   | 48px (3rem)    | 區塊間距 |

---

## 🔲 圓角系統

| Token | 值             | 用途          |
| ----- | -------------- | ------------- |
| sm    | 4px (0.25rem)  | 小元素 (標籤) |
| base  | 6px (0.375rem) | 輸入框、按鈕  |
| md    | 8px (0.5rem)   | 卡片、選單    |
| lg    | 12px (0.75rem) | 大按鈕、彈窗  |
| xl    | 16px (1rem)    | 大卡片        |
| full  | 9999px         | 膠囊/圓形     |

---

## 🌫️ 陰影系統

```css
/* 卡片基礎陰影 */
box-shadow:
  0 1px 3px 0 rgba(58, 54, 51, 0.1),
  0 1px 2px 0 rgba(58, 54, 51, 0.06);

/* 卡片 hover 陰影 */
box-shadow:
  0 4px 6px -1px rgba(58, 54, 51, 0.1),
  0 2px 4px -1px rgba(58, 54, 51, 0.06);

/* 按鈕陰影 */
box-shadow: 0 2px 8px rgba(181, 152, 106, 0.15);

/* 按鈕 hover 陰影 */
box-shadow: 0 4px 12px rgba(181, 152, 106, 0.25);

/* focus 光環 */
box-shadow: 0 0 0 3px rgba(196, 165, 114, 0.1);
```

---

## 🔘 按鈕樣式

### 主要按鈕 (Primary Button)

```css
.btn-morandi-primary {
  background: linear-gradient(to right, #b5986a, #d4c4a8);
  color: white;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  border: none;
  box-shadow: 0 2px 8px rgba(181, 152, 106, 0.15);
  transition: all 0.2s ease;
}

.btn-morandi-primary:hover {
  background: linear-gradient(to right, #a08968, #c4b89a);
  box-shadow: 0 4px 12px rgba(181, 152, 106, 0.25);
  transform: scale(1.02);
}

.btn-morandi-primary:active {
  transform: scale(0.98);
}
```

### 次要按鈕 (Secondary Button)

```css
.btn-morandi-secondary {
  background: rgba(255, 255, 255, 0.8);
  color: var(--morandi-gold); /* #c9aa7c */
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(228, 221, 212, 0.5);
  transition: all 0.2s ease;
}

.btn-morandi-secondary:hover {
  background: rgba(255, 255, 255, 1);
  border-color: var(--morandi-gold);
  transform: scale(1.02);
}
```

### 圖標按鈕 (Icon Button)

```css
.btn-icon-morandi {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, rgba(212, 197, 169, 0.1), rgba(201, 184, 150, 0.15));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--morandi-gold);
  transition: all 0.3s ease;
}

.btn-icon-morandi:hover {
  background: linear-gradient(135deg, #d4c5a9, #c9b896, #bfad87);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(196, 165, 114, 0.25);
}
```

---

## 📦 卡片樣式

```css
.morandi-card {
  background-color: var(--card); /* #ffffff */
  border: 1px solid var(--border); /* #d4c4b0 */
  border-radius: 8px;
  box-shadow:
    0 1px 3px 0 rgba(58, 54, 51, 0.1),
    0 1px 2px 0 rgba(58, 54, 51, 0.06);
  transition: all 0.2s ease-in-out;
}

.morandi-card:hover {
  box-shadow:
    0 4px 6px -1px rgba(58, 54, 51, 0.1),
    0 2px 4px -1px rgba(58, 54, 51, 0.06);
  border-color: var(--morandi-gold); /* #c9aa7c */
}
```

### 精緻卡片 (Elevated Card)

```css
.card-morandi-elevated {
  background: var(--card);
  border: 1px solid rgba(230, 221, 212, 0.5);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(181, 152, 106, 0.08);
  transition: all 0.2s ease;
}

.card-morandi-elevated:hover {
  border-color: rgba(181, 152, 106, 0.3);
  box-shadow: 0 4px 16px rgba(181, 152, 106, 0.12);
  transform: translateY(-2px);
}
```

---

## 📝 表單元素

### 輸入框 (Input)

```css
input {
  width: 100%;
  height: 2.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--input-text); /* #3a3633 */
  background-color: var(--input-bg); /* #ffffff */
  border: 1px solid var(--input-border); /* #d4c4b0 */
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

input:hover {
  border-color: var(--input-border-hover); /* #c4a572 */
}

input:focus {
  border-color: var(--input-border-focus); /* #c4a572 */
  box-shadow: 0 0 0 3px rgba(196, 165, 114, 0.1);
  outline: none;
}

input::placeholder {
  color: var(--input-placeholder); /* #b8b2aa */
  opacity: 0.6;
}
```

### 下拉選單 (Select)

```css
select {
  appearance: none;
  background-image: url('data:image/svg+xml,...'); /* 自訂箭頭 */
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  /* 其他樣式同 input */
}
```

---

## 📋 側邊欄選單

### 選單項目

```css
.menu-item-morandi {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  color: var(--morandi-secondary); /* #8b8680 */
  background: transparent;
  transition: all 0.2s ease;
}

.menu-item-morandi:hover {
  background: rgba(181, 152, 106, 0.05);
  color: var(--morandi-primary); /* #3a3633 */
}

.menu-item-morandi.active {
  background: rgba(181, 152, 106, 0.1);
  color: var(--morandi-gold); /* #c9aa7c */
  font-weight: 500;
  transform: scale(1.05);
}

/* Active 狀態的右側指示條 */
.menu-item-morandi.active::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  background: linear-gradient(to bottom, #b5986a, #d4c4a8);
  border-radius: 2px 0 0 2px;
}
```

---

## 🏷️ 徽章/標籤

```css
.badge-morandi {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(181, 152, 106, 0.1);
  color: var(--morandi-gold); /* #c9aa7c */
  border: 1px solid rgba(181, 152, 106, 0.2);
}
```

---

## ➖ 分隔線

```css
.divider-gradient {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(212, 197, 169, 0.4) 20%,
    rgba(201, 184, 150, 0.5) 50%,
    rgba(212, 197, 169, 0.4) 80%,
    transparent
  );
  border: none;
  margin: 1rem 0;
}
```

---

## ⚡ 動畫與過渡

### 全域過渡

```css
* {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

### 按鈕互動

```css
/* hover 放大 */
transform: scale(1.02);

/* active 縮小 */
transform: scale(0.98);

/* 卡片 hover 上浮 */
transform: translateY(-2px);
```

### 淡入動畫

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
```

---

## 📱 響應式斷點

| 斷點 | 寬度   | 說明            |
| ---- | ------ | --------------- |
| sm   | 640px  | 手機橫向        |
| md   | 768px  | 平板直向        |
| lg   | 1024px | 平板橫向/小筆電 |
| xl   | 1280px | 桌面            |
| 2xl  | 1536px | 大螢幕          |

---

## 🖼️ Logo 規範

### 主 Logo

- **圖形**: 金色圓角方塊內白色 "V" 字
- **顏色**: 背景 `#c9aa7c`，文字白色
- **尺寸**: 40x40px (w-10 h-10)
- **圓角**: 8px (rounded-lg)

### 文字標誌

- **文字**: "CORNER"
- **字體**: 粗體 (font-bold)
- **大小**: 1.25rem (text-xl)
- **顏色**: `--morandi-primary` (#3a3633)

---

## 🎯 設計原則總結

1. **低飽和度**: 所有顏色都加入灰調
2. **柔和漸層**: 按鈕、背景使用微妙漸層而非純色
3. **細膩陰影**: 陰影使用暖色調 (rgba 帶棕色)
4. **舒適過渡**: 所有互動都有 0.2-0.3s 過渡動畫
5. **微妙放大**: hover 時 1.02-1.05 倍放大增加互動感
6. **金色點綴**: 使用莫蘭迪金 (#c9aa7c) 作為強調色
7. **隱藏滾動條**: 預設隱藏，只在滾動時顯示
8. **圓角統一**: 小元素 4-6px，大元素 8-16px

---

## 📦 可複製的完整 CSS 變數

```css
:root {
  --morandi-primary: #3a3633;
  --morandi-secondary: #8b8680;
  --morandi-gold: #c9aa7c;
  --morandi-gold-hover: #b8996b;
  --morandi-green: #9fa68f;
  --morandi-red: #c08374;
  --morandi-container: #e8e5e0;
  --morandi-muted: #b8b2aa;

  --background: #f6f4f1;
  --card: #ffffff;
  --border: #d4c4b0;
  --accent: #e8e5e0;

  --input-border: #d4c4b0;
  --input-border-hover: #c4a572;
  --input-border-focus: #c4a572;
  --input-bg: #ffffff;
  --input-text: #3a3633;
  --input-placeholder: #b8b2aa;
}
```

---

> 💡 **給 AI 的提示**: 這是一個優雅、低調、專業的企業管理系統設計風格。核心是「莫蘭迪色系」- 所有顏色都帶灰調，主色是奶茶金 (#c9aa7c)，整體感覺溫暖但不張揚。按鈕使用漸層，卡片有柔和陰影，所有互動都有微妙的放大和過渡效果。
