# Autoresearch Skill — ERP 自動優化迴圈

> 給 William 看的 skill 說明
> 仿 Karpathy autoresearch、ERP 收斂式變體
> 建立：2026-05-02

---

## 一句話

**指揮官設目標、agent 自動找事做、自動驗證、留好的丟壞的、永遠在跑**

---

## 跟 Karpathy autoresearch 的差異

| 維度 | Karpathy autoresearch | 你的 ERP autoresearch |
|---|---|---|
| 指揮目標 | val_bpb 越低越好（連續）| 守門 11/11 全綠（離散）|
| Agent 探索 | 改超參數找最佳訓練 | 修違規清 backlog |
| 模式 | 探索式（沒終點）| 收斂式（清光就停、補新事再跑）|
| Verifier | 訓練本身（GPU 跑 5 分鐘）| 守門 script + tsc + DB 抽查 |
| 失敗代價 | 浪費 5 分鐘 GPU | 可能 break src、所以更嚴格 |
| 入口檔 | `program.md` | `docs/_agent_entry.md` |

---

## 4 個檔組成這個 skill

```
docs/
├── VENTURO_ERP_STANDARDS.md   ← 憲法（指揮目標、不變）
├── SCHEMA_PLAN.md             ← 業務地圖
├── _agent_entry.md            ← agent 第一份讀的、流程定義 ← 新增
└── _followup_backlog.md       ← 待做清單、結構化 ← 新增

scripts/
├── check-standards.sh         ← 守門（agent 的 verifier）
└── audit-loop.sh              ← audit + 列 ready task ← 新增
```

---

## 怎麼用

### 場景 A：你想看 ERP 現況

```bash
./scripts/audit-loop.sh
```

輸出：守門狀態 / backlog ready task / 建議下一步

### 場景 B：派 agent 做下一個優化

開新 Claude session、貼：

> 讀 `/Users/william/Projects/venturo-erp/docs/_agent_entry.md`、跑 `./scripts/audit-loop.sh` 看現況、做 backlog 第一個 LOW 風險 task、完成後寫 loop_run 報告、不 commit。

agent 自己照流程跑。

### 場景 C：發現新優化 / 違規

加進 `_followup_backlog.md` 對應風險 section、下次跑 audit-loop 會看到。

### 場景 D：上線前 final check

```bash
./scripts/audit-loop.sh --json
# ready_for_smoke_test=true → 守門過 + backlog LOW 清空 = 可上線
```

---

## 限制

### Agent 能做

✅ 機械式重構（命名 / index / trigger / type / 死碼）
✅ DB schema 收斂（backlog 列出的）
✅ 跑 migration + tracking
✅ 跑守門 + tsc 驗證
✅ 自動 git restore 失敗 run

### Agent 不能做

❌ 改業務語意
❌ 拆 god component（沒 e2e 守）
❌ 動凍結模組
❌ commit / push
❌ 自己加 backlog task

### 你必須做

- 跑 smoke test（agent 取代不了）
- 拍板 commit / 上線
- 加新 backlog
- 凍結模組解凍決策

---

## 未來複用到別的專案

這 6 個檔結構通用：

1. **憲法**（指揮目標）
2. **業務地圖**（DB-driven 專案需要）
3. **`_agent_entry.md`**（流程 + 鐵律）
4. **`_followup_backlog.md`**（結構化 task）
5. **守門 script**（規範 → grep）
6. **audit-loop script**（串起來）

新專案複用：
1. Copy 6 個檔
2. 重寫憲法（新專案禁止規則）
3. 重寫守門 grep（對應新規則）
4. 從新專案 audit 結果產出 backlog
5. agent 接著跑

---

## 為什麼比「手動派 agent」好

這次我手動派 18 agent 有問題：
- 每個 agent 我寫長 prompt（重複）
- 沒系統化記錄「下個該做什麼」（靠記憶）
- 沒「自動 revert 失敗」（我手動 type-check）
- session 結束 = 上下文丟

skill 解決：
- 入口檔 = 標準 prompt
- backlog = 系統化 task 清單
- audit-loop = 自動化驗證
- 自含 = 任何 session 接手都能繼續

---

## 啟動方式

```
讀 docs/_agent_entry.md
跑 ./scripts/audit-loop.sh
做 backlog 第一個 LOW 風險 task
不 commit、寫 loop_run 報告
```

就這樣。

---

## 指揮目標的本質

不是「修完 ERP」（已做完一輪）。

是：**ERP 永遠維持憲法等級乾淨**。

新功能加進來、agent 自動偵測違規 → 修 → 驗證 → 報告。
你只設目標（憲法）、不手動跑 audit。

= Karpathy autoresearch 精神：**指揮官設目標、agent 範圍內自主跑、永遠優化**。

差別：Karpathy 優化 model loss、你優化 ERP 乾淨度。
