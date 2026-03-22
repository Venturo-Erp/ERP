# 🔧 開發者手冊

**給 Matthew、前端工程師、IT 團隊的開發指南**

---

## 🚀 快速開始

### 本機開發環境

```bash
# ERP
cd ~/Projects/venturo-erp
npm run dev

# Online
cd ~/Projects/venturo-online
npm run dev --port 3001
```

### Dev Server

- **ERP**: http://100.89.92.46:3000
- **Online**: http://100.89.92.46:3001

---

## 📖 必讀文檔

- [遊戲攻略](../shops/erp/GAME_GUIDE.md) — 用遊戲語言理解 ERP
- [核心邏輯](../shops/erp/CORE_LOGIC.md) — 行程/報價/需求的核心邏輯
- [函式索引](../shops/erp/FUNCTIONS_INDEX.md) — 所有函式的位置和用途

---

## 🎮 開發哲學

### 1. 關聯表優先

永遠用關聯表，不用 JSONB。

### 2. 核心驅動

所有操作都從核心表（`tour_itinerary_items`）讀寫。

### 3. 遊戲語言

用遊戲比喻解釋概念，讓非技術人員也能理解。

---

_（完整內容待補充）_
