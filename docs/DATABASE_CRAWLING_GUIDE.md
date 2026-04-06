# 旅遊資料庫 — 爬文與資料建檔指南

> 給負責爬文的同事參考，統一資料格式和分類標準

## 三個資料表

| 表 | 用途 | ERP 位置 |
|---|---|---|
| `attractions` | 景點活動 | 資料庫管理 → 景點活動 |
| `hotels` | 飯店住宿 | 資料庫管理 → 飯店 |
| `restaurants` | 餐廳美食 | 資料庫管理 → 餐廳 |

**重點：三個表分開，不要混放！**
- 飯店 → `hotels` 表
- 餐廳 → `restaurants` 表
- 其他所有景點、活動、體驗 → `attractions` 表

---

## attractions 景點分類標準

| 分類 (category) | 包含內容 | 範例 |
|---|---|---|
| `景點 / Attraction` | 一般景點、觀景台、步道、文創園區 | 101 大樓、淺草寺、龍山寺 |
| `歷史文化 / History & Culture` | 歷史古蹟、博物館、寺廟、神社、宗教聖地 | 大皇宮、故宮、金閣寺 |
| `地標建築 / Landmark` | 知名地標、特色建築、纜車 | 東京鐵塔、雪梨歌劇院 |
| `自然風景 / Nature` | 公園、海灘、島嶼、溫泉、山岳、滑雪場 | 富士山、長灘島、北投溫泉 |
| `主題樂園 / Theme Park` | 主題樂園、動物園、水族館 | 迪士尼、環球影城 |
| `購物 / Shopping` | 購物中心、商圈、夜市、老街 | 心齋橋、恰圖恰市場 |
| `活動體驗 / Activity` | 文化體驗、手作工坊、料理課、頂級體驗 | 和服體驗、泰拳課程 |
| `娛樂 / Entertainment` | 娛樂場所、夜生活、表演 | 紅磨坊、啤酒屋 |

---

## 必填欄位

### attractions（景點）

| 欄位 | 說明 | 必填 | 範例 |
|---|---|---|---|
| `name` | 中文名稱 | **必填** | 清水寺 |
| `english_name` | 英文名稱 | 建議填 | Kiyomizu-dera |
| `country_id` | 國家 ID | **必填** | japan |
| `city_id` | 城市 ID | 建議填 | kyoto |
| `category` | 分類（見上表） | **必填** | 歷史文化 / History & Culture |
| `description` | 景點介紹 | 建議填 | 150-200 字繁體中文 |
| `tags` | 標籤（陣列） | 建議填 | ["世界遺產", "賞櫻", "寺廟"] |
| `latitude` | 緯度 | 建議填 | 34.994856 |
| `longitude` | 經度 | 建議填 | 135.785046 |
| `duration_minutes` | 建議停留時間 | 建議填 | 60 |
| `ticket_price` | 門票資訊 | 選填 | 成人 400 日圓 |
| `opening_hours` | 營業時間 | 選填 | 06:00-18:00 |
| `address` | 地址 | 選填 | 京都府京都市東山區清水1-294 |
| `phone` | 電話 | 選填 | +81-75-551-1234 |
| `website` | 官網 | 選填 | https://www.kiyomizudera.or.jp |
| `images` | 圖片 URL（陣列） | 選填 | 在 ERP 上傳即可 |

### hotels（飯店）

| 欄位 | 說明 | 必填 | 範例 |
|---|---|---|---|
| `name` | 飯店名稱 | **必填** | 星野虹夕諾雅 |
| `english_name` | 英文名 | 建議填 | Hoshinoya Kyoto |
| `country_id` | 國家 ID | **必填** | japan |
| `city_id` | 城市 ID | 建議填 | kyoto |
| `star_rating` | 星級 | 建議填 | 5 |
| `description` | 飯店介紹 | 建議填 | 150-200 字 |
| `price_range` | 價位等級 | 選填 | $$$$ |
| `avg_price_per_night` | 每晚均價 | 選填 | 50000 |
| `currency` | 幣別 | 選填 | JPY |
| `room_types` | 房型（JSON） | 選填 | - |
| `amenities` | 設施（JSON） | 選填 | - |
| `address` | 地址 | 選填 | - |
| `website` | 官網 | 選填 | - |
| `latitude` / `longitude` | 座標 | 建議填 | - |

### restaurants（餐廳）

| 欄位 | 說明 | 必填 | 範例 |
|---|---|---|---|
| `name` | 餐廳名稱 | **必填** | 一蘭拉麵 |
| `english_name` | 英文名 | 建議填 | Ichiran Ramen |
| `country_id` | 國家 ID | **必填** | japan |
| `city_id` | 城市 ID | 建議填 | fukuoka |
| `cuisine_type` | 料理類型（JSON 陣列） | 建議填 | ["拉麵", "日本料理"] |
| `description` | 餐廳介紹 | 建議填 | 150-200 字 |
| `price_range` | 價位等級 | 選填 | $$ |
| `avg_price_lunch` | 午餐均價 | 選填 | 1000 |
| `avg_price_dinner` | 晚餐均價 | 選填 | 1500 |
| `currency` | 幣別 | 選填 | JPY |
| `meal_type` | 餐別 | 選填 | 午餐、晚餐 |
| `reservation_required` | 需要預約 | 選填 | true/false |
| `private_room` | 有包廂 | 選填 | true/false |
| `address` | 地址 | 選填 | - |
| `website` | 官網 | 選填 | - |
| `latitude` / `longitude` | 座標 | 建議填 | - |

---

## country_id / city_id 對照

在 ERP 的「國家/區域」tab 可以查看所有可用的國家和城市 ID。

常用國家 ID：
| country_id | 名稱 |
|---|---|
| japan | 日本 |
| korea | 韓國 |
| thailand | 泰國 |
| vietnam | 越南 |
| china | 中國 |
| indonesia | 印尼 |
| malaysia | 馬來西亞 |
| singapore | 新加坡 |

常用城市 ID 範例：
- 日本：tokyo, osaka, kyoto, fukuoka, sapporo, okinawa
- 泰國：bangkok, chiang-mai, phuket
- 韓國：seoul, busan, jeju
- 越南：hanoi, ho-chi-minh, da-nang

---

## 座標取得方式

1. **Google Maps**：找到景點 → 右鍵 → 複製座標
2. **格式**：`緯度, 經度`（例如 `34.994856, 135.785046`）
3. **在 ERP 的編輯對話框**：可以直接貼座標或貼 Google Maps 連結

---

## 描述撰寫風格

- **繁體中文**，150-200 字
- 感性有資訊量，有畫面感
- 包含：特色亮點、適合誰、最佳造訪時間
- 範例：
  > 清水寺是京都最具代表性的世界遺產，建於 778 年的古寺以懸空的「清水舞台」聞名。從舞台眺望京都市區與音羽山的景色，春櫻秋楓時節尤為壯觀。寺內音羽瀑布的三道泉水分別代表學業、戀愛與健康，是許多旅人的許願聖地。

---

## 注意事項

1. **不要在景點表放飯店或餐廳** — 各放各的表
2. **category 必須用標準名稱** — 見上方分類表，不要自創
3. **country_id 和 city_id 用英文小寫** — 不是中文
4. **座標格式** — 緯度在前、經度在後，用逗號分隔
5. **重複檢查** — 新增前先搜尋名稱，避免重複建檔
6. **圖片** — 在 ERP 對話框裡直接上傳，支援拖曳
