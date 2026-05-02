# Agent Entry — ERP 持續優化迴圈入口

> **給接手的 AI agent / 未來 session 的第一份讀**
> 仿 Karpathy autoresearch 的 `program.md` 概念、ERP 收斂式變體
>
> 最後更新：2026-05-02

---

## 你是誰、你的目標

你是被派來做 **venturo-erp 持續優化** 的 AI agent。

**指揮目標**（人類定的、你不要改）：
1. 守住憲法 11/11 守門全綠
2. 持續清 backlog
3. 不破壞業務語意（這條最難、見「鐵律」）

**你不是要找最佳解、是要把違規清光 + 維持規範。** ERP 是收斂式工程、不是探索式。

---

## 第零步：Prerequisite check（不過就停、不擅自繞過）

```bash
# main 必須接近乾淨、不然 isolation 不成立
DIRTY=$(git status --short | wc -l | tr -d ' ')
if [ "$DIRTY" -gt 5 ]; then
  echo "⚠️ main 有 $DIRTY 個未 commit 改動"
  echo "停手、回報人類：'main dirty、需先處理才能 isolation' "
  exit 1
fi
```

不過：
- ❌ **不要擅自 stash** 既存改動（可能是人類正在做的事）
- ❌ **不要硬切 branch 跑** task（你的驗證會混到既存改動的影響）
- ✅ 回報人類、列出三選項：(A) 你 commit / stash (B) 我 disclose 硬跑 (C) 我 stash → 跑完 → 你 pop。等拍板。

---

## 第一步：讀規範（每次 session 開頭必讀）

按優先順序：

1. **`docs/VENTURO_ERP_STANDARDS.md`** — 憲法（SSOT、21+ 條禁止規則）
2. **`docs/SCHEMA_PLAN.md`** — ERP 業務地圖（表結構 + SSOT 主表）
3. **`docs/_followup_backlog.md`** — 你可挑的 task 清單
4. **`scripts/check-standards.sh`** — 守門 script（你的 verifier）

---

## 第二步：跑現況 audit

```bash
./scripts/audit-loop.sh
```

這會輸出：
- 守門目前是 X/X 通過
- backlog 中 Y 個 task ready-to-go
- 建議優先做哪個

---

## 第三步：選 task

從 `_followup_backlog.md` 挑、**永遠選**：

✅ **沒前置依賴**（其他 task 沒擋你）
✅ **風險等級「低」**（先做安全的、累積成果）
✅ **範圍最小**（單一檔、單一概念）

❌ 不要挑：
- 「高風險 / 需人類」標籤的（God component 拆解、業務語意改）
- 凍結模組相關的（憲法 §16）
- 沒在 backlog 裡的（沒授權、不要自己加事做）

---

## 第四步：執行

### 4.1 切 branch（永不直推 main）

```bash
git checkout -b auto/<task-id>-<short-desc>
```

### 4.2 改檔

只改 backlog task 描述明列的範圍。**不擴大範圍**。

### 4.3 驗證（這就是你的 verifier、不能跳）

按順序跑、有任何 fail 就停：

```bash
# 1. type-check
npx tsc --noEmit

# 2. 守門
./scripts/check-standards.sh --strict

# 3. （如果動 DB）抽查 schema
# 用 Management API 確認 schema 變動真的生效
```

### 4.4 成功 / 失敗 決策（autoresearch 的「留 / 丟」）

**全綠** = 留 + 報告（不 commit、人類 review）：
- 寫 `docs/_session/_loop_run_<timestamp>.md`：做了什麼、驗證結果、變動的檔
- 標記 backlog 對應 task 為「ready for human review」

**任一紅** = 自動 git restore：
```bash
git checkout main
git branch -D auto/<task-id>-<short-desc>
# 寫 retry note 到 _followup_backlog.md 該 task 下方
```

---

## 鐵律（違反 = 整次 run 失敗）

1. ❌ **不動凍結模組**（channels / messages / channel_members / channel-chat / channel-sidebar、見憲法 §16）
2. ❌ **不 commit**（一定切 branch、人類拍板才 commit）
3. ❌ **不違反憲法 §10 任何一條**（21 條禁止清單）
4. ❌ **不擴大範圍超過 backlog task 描述**
5. ❌ **不刪 / 不動 production 資料**（migration 只能改 schema、不 DELETE FROM 業務表 rows）
6. ❌ **不 push 到 remote**
7. ❌ **不繞 migration tracking 直接改 DB function**（憲法 §17）

---

## 怎麼判斷「業務語意」改錯了

技術 metric（tsc 0 + 守門 11/11）**抓不到業務語意 bug**。例如：
- 把 `WHERE is_active = true` 改成 `WHERE is_active IS NOT NULL` — 守門過、但語意錯
- 把 query 條件加錯欄位 — 守門過、但回的資料不對

對策：
- **不改業務 query 邏輯**（如果 task 是這類、標 `needs_human` 跳過）
- **只做機械式重構**（命名、index、trigger、type、清死 code）
- **碰到模糊地帶 → 寫進 retry note 給人類**

---

## 工作日誌規範

每次 run 留下檔：`docs/_session/_loop_run_<YYYYMMDD-HHMMSS>.md`

格式：
```markdown
# Loop Run YYYY-MM-DD HH:MM:SS

## Task
- ID: [backlog task id]
- 描述: [一行]

## 改動
- 檔案 X：[做了什麼]
- 檔案 Y：[做了什麼]
- migration: [檔名 or 無]

## 驗證
- tsc: 0 errors / X errors
- 守門: 11/11 / 失敗 #N
- 抽查: [內容]

## 結果
- ✅ 留下、ready for human review
- ❌ git restore、retry note 寫進 backlog

## 異常與發現
[有就寫]
```

---

## 範例執行

假設 backlog 第一個 task 是「整合 8 個重複 trigger function」：

```
1. 讀 backlog → 挑 B-001（trigger 整合、低風險、無前置）
2. 切 branch: git checkout -b auto/B-001-merge-trigger-functions
3. 改：寫 migration DROP 重複 functions、改 trigger 用 set_updated_at()
4. 跑 tsc → 0 errors
5. 跑守門 → 11/11 全綠
6. 抽查 DB → 確認重複 functions 已 DROP
7. 寫 _loop_run_xxx.md 報告
8. 不 commit、報告給人類「ready for review」
```

---

## 你不是孤獨的

每次 run 完讀 `_session/_loop_run_*.md` 看上次跑什麼、避免重複試。
backlog 結尾有「已完成」section、登記過的 task ID 不要再挑。

---

## 終止條件

當 backlog 「低風險」section 全部清空 + 守門 11/11 → 你完成階段任務。
寫 `_session/_loop_complete_<date>.md` 通知人類。
不要自己找新事做、等人類補充 backlog。
