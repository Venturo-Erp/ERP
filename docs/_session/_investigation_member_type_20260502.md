# 訂單 member_type 欄位調查報告

> 2026-05-02、回應 W 提問「建立訂單時不一定會有成員、原本是否有設定成員類型？」

## DB 現況

**`order_members.member_type`** 欄位：
- type: `text`
- **NOT NULL**（強制必填）
- **無 default**

實際 production 資料：
```
member_type | rows
adult       | 150
```

**所有 150 筆團員、member_type 都是 'adult'。沒有第二種值出現。**

## 程式碼問題

`src/app/api/orders/create-from-booking/route.ts` line 66-72 建 order_members payload：

```ts
const members = travelers.map((t) => ({
  order_id: order.id,
  workspace_id: tour.workspace_id,
  chinese_name: t.chineseName,
  pinyin_name: t.pinyinName,
  date_of_birth: t.dateOfBirth || null,
  // 漏給 member_type ← 這裡 INSERT 必爆（NOT NULL 違反）
}))
```

DB 強制 NOT NULL、code 沒給 → INSERT 一定失敗。所以**這條 code path 應該從沒被實際執行過、或執行就出錯被 logger 吞掉**（line 76-79 「不中斷、繼續」）。

## 業務語意推測

「成員類型」這欄位可能原本想分：
- `adult`（大人）
- `child`（小孩、影響保險 / 機票價格）
- `infant`（嬰兒）

但**現況實質沒人在用**（150 筆都 adult、code 也不給）。

## W 拍板選項

| 選項 | 動作 | 何時適合 |
|---|---|---|
| **A. 補 default、最 surgical** | DB `ALTER COLUMN member_type SET DEFAULT 'adult'` + code INSERT 補 `member_type: 'adult'` | 你想保留「未來細分大人 / 小孩」的可能性、現在先讓 INSERT 過 |
| **B. 拿掉 NOT NULL** | `ALTER COLUMN member_type DROP NOT NULL` + 加 default 'adult'（雙保險） | 一樣保留彈性、但允許 NULL（更鬆） |
| **C. 直接砍欄位** | DROP COLUMN member_type | 你確定永遠不分大人小孩、或未來真要分再重建 |
| **D. 留著、之後重做** | 不動、列 follow-up（順著「之後 LINE 客服 / 訂單流程整套重做」一起做） | 你想暫不動、之後跟訂單流程重設計時一起決定 |

## 我的建議

**選 A**（補 default 'adult' + code 補 'adult'）。理由：
- 旅遊業務上「分大人 / 小孩」是常見需求、未來會重要
- 補 default 完全不影響現有 150 筆資料
- INSERT 馬上能用、N-001 暴露的 bug 解決
- 改動最小：1 個 ALTER COLUMN migration + 1 行 code

**附帶提醒**：選 A 後、現在 code 寫死 `'adult'` 是 placeholder。之後做訂單流程重設計時、如果要從 booking form 帶入大人/小孩選項、就改成從 `t.memberType` 讀。
