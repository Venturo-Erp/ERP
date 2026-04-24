# API 變更日誌 (API Changelog)

這份文件作為前後端開發的整合契約，記錄所有 API 的變更歷史。請所有工程師在進行 API 相關的修改時，務必在此新增一筆紀錄。

---

## **v0.1.0**

- **日期 (Date):** 2025-12-21
- **作者 (Author):** System (Initial Definition)
- **類型 (Type):** `[新增] Added`
- **端點 (Endpoint):** `GET /api/v2/itineraries/{id}`
- **描述 (Description):**
  - 取得單一行程的詳細資料。此 API 具備「角色感知」能力，會根據呼叫者的身份（領隊 vs. 旅客）回傳不同的資料欄位和權限等級。
- **契約細節 (Contract Details):**
  - **Request Body:** `N/A`
  - **Response Body:**
    ```json
    {
      "id": "itinerary-101",
      "name": "日本關西五日遊",
      "status": "confirmed",
      "permission_level": "viewer", // or "editor" for tour leader
      "days": [
        {
          "day": 1,
          "topic": "抵達與市區探索",
          "events": [
            {
              "type": "flight",
              "details": "CI-152, 08:30 TPE -> 12:00 KIX",
              "pnr": "ABCDEF" // 根據旅客個人化顯示
            },
            {
              "type": "hotel",
              "details": "大阪希爾頓酒店",
              "room_number": "1201" // 根據旅客個人化顯示
            }
          ]
        }
      ],
      // ---- 僅領隊可見的欄位 ----
      "cost_details": {
        // This block is ONLY present IF permission_level is "editor"
        "total_cost": 500000,
        "profit_margin": 0.15
      }
    }
    ```

---

## **v0.1.1**

- **日期 (Date):** 2025-12-21
- **作者 (Author):** System (Initial Definition)
- **類型 (Type):** `[新增] Added`
- **端點 (Endpoint):** `POST /api/v2/itineraries/{id}/expenses`
- **描述 (Description):**
  - 領隊為指定行程新增一筆開銷紀錄。後端需驗證使用者權限。
- **契約細節 (Contract Details):**
  - **Request Body:**
    ```json
    {
      "item_id": "event-202", // 可選，關聯到行程中的具體項目
      "expense_type": "計畫外",
      "actual_amount": 500,
      "notes": "請客人吃冰"
    }
    ```
  - **Response Body (Success 201 Created):**
    ```json
    {
      "expense_id": "expense-901",
      "itinerary_id": "itinerary-101",
      "item_id": "event-202",
      "leader_id": "user-leader-007",
      "expense_type": "計畫外",
      "planned_amount": 0, // 因為是計畫外
      "actual_amount": 500,
      "notes": "請客人吃冰",
      "created_at": "2025-12-21T14:00:00Z"
    }
    ```

---
