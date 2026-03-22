# Venturo ERP 開發工作流設計

**建立時間**：2026-03-10 06:24  
**建立原因**：經過今天的 2 小時誤診教訓，團隊需要一套標準化的「開發 → 出錯 → 測試」工作流

---

## 📊 需求分析（從記憶庫 + 會議記錄）

### 1. 開發流程問題

- ✅ 有流程：需求 → 任務拆解(CURRENT_TASK.md) → coding agent → 驗證 → 部署
- ❌ 經常違反原則：
  - 改之前沒 grep 查引用
  - 改之後沒確認 TypeScript 零錯誤
  - 刪檔前沒查所有 import
  - 違反「先讀自己再看外面」（Eddie 的教訓）

### 2. Debug 問題（今天的痛點）

- **症狀**：按鈕失效
- **誤診時間**：2 小時
- **真正原因**：殘留進程（pid 81566）沒清掉
- **應該做法**：先檢查進程 → 清理 → 重啟 → 再檢查代碼
- **實際做法**：直接研究 hydration mismatch、localStorage、SSR 快取...（全錯）

### 3. 測試問題

- 凱撒要測試功能 → 手動點 UI
- 測試報告都是手寫 markdown
- 沒有自動化測試腳本
- 測試 SUCCESS 公司花了 1 小時才發現按鈕失效

### 4. 協作問題

- 8 個 AI agent，各自為政
- Leon 等 IT 確認資料表結構才能做事
- Eddie 浪費時間研究開源系統，應該先盤點現有模組

### 5. 已有的基礎設施

- ✅ Overnight Dev 系統（YAML → Claude Code → git → Telegram）
- ✅ CURRENT_TASK.md 任務追蹤
- ✅ OpenClaw skill/hook/multi-agent 系統
- ✅ 向量庫（mem0）
- ✅ 週會制度

---

## 🎯 設計目標

### 核心理念

**「AI 讓你變快，Workflow 讓你變強」**

### 三大支柱

1. **自動化 > 手動** — 任何超過 2 行指令的事情都自動化
2. **SOP > 臨時判斷** — 標準流程 > 每次重新思考
3. **先檢查系統 > 先改代碼** — Debug 時先看環境，再看邏輯

---

## 🛠️ 工作流設計

### Phase 1：Debug Workflow（最優先）

**目標**：按鈕失效 10 秒搞定，不是 2 小時

#### Skill: `venturo-debug`

**觸發方式**：

```
/venturo-debug buttons     # 按鈕失效診斷
/venturo-debug api         # API 失效診斷
/venturo-debug db          # 資料庫連線診斷
```

**診斷 SOP（按鈕失效）**：

```bash
# 1. 檢查殘留進程
ps aux | grep -E "next|node.*3000" | grep -v grep

# 2. 檢查 port 佔用
lsof -ti:3000

# 3. 清理並重啟
kill -9 <pid> && cd ~/projects/venturo-erp && npm run dev

# 4. 等待啟動
sleep 10

# 5. 測試按鈕
curl -s http://localhost:3000/tours | grep "開團"

# 6. 如果還失效，才檢查代碼
# - 檢查 Console errors
# - 檢查 TypeScript 編譯錯誤
# - 檢查最近的 git commits
```

**輸出格式**：

```markdown
## 診斷結果

✅/❌ 殘留進程檢查
✅/❌ Port 佔用檢查
✅/❌ Dev server 啟動
✅/❌ 頁面載入
✅/❌ 按鈕存在

### 建議行動

- 如果全✅ → 代碼問題，需要人工介入
- 如果有❌ → 已自動修復，請重新測試
```

**實作方式**：

- 建立 `~/.openclaw/workspace-matthew/skills/venturo-debug/`
- `SKILL.md` — 診斷流程指令
- `check-buttons.sh` — 自動化腳本
- `check-api.sh` — API 診斷腳本
- `check-db.sh` — DB 診斷腳本

---

### Phase 2：Test Workflow

**目標**：凱撒不用手動點 UI，自動化測試

#### Skill: `venturo-test`

**觸發方式**：

```
/venturo-test all               # 全系統測試
/venturo-test tours             # Tours 模組測試
/venturo-test hr                # HR 模組測試
/venturo-test company SUCCESS   # 特定租戶測試
```

**測試腳本結構**：

```bash
# test-tours.sh
1. 登入 SUCCESS 公司
2. 開啟 /tours 頁面
3. 檢查「開團」按鈕存在且可點擊
4. 點擊「開團」
5. 檢查對話框開啟
6. 填寫表單（自動產生測試資料）
7. 提交表單
8. 檢查成功訊息
9. 驗證資料庫（SELECT * FROM tours WHERE ...）
10. 清理測試資料
```

**測試資料管理**：

- 使用 SUCCESS 公司作為測試租戶
- 自動產生測試資料（`generate-test-data.ts`）
- 測試後自動清理

**測試報告**：

```markdown
# Venturo ERP 測試報告 — 2026-03-10 06:30

## Tours 模組

✅ 頁面載入
✅ 按鈕可點擊
✅ 對話框開啟
✅ 表單提交
✅ 資料寫入
⏱️ 總耗時：23 秒

## HR 模組

✅ 新增員工
✅ 薪資請款
⏱️ 總耗時：15 秒

## 總結

通過率：100% (8/8)
總耗時：38 秒
```

**實作方式**：

- Playwright + TypeScript
- 整合 browser tool（OpenClaw 內建）
- Cron job（每天自動跑）

---

### Phase 3：Dev Workflow

**目標**：確保開發原則被遵守

#### Skill: `venturo-dev`

**觸發方式**：

```
/venturo-dev start "新增供應商報價比較功能"
/venturo-dev check          # 檢查開發原則
/venturo-dev commit         # 提交前檢查
```

**開發 SOP**：

```markdown
## 開始開發

1. 讀取 CURRENT_TASK.md
2. 搜尋向量庫（有沒有相關知識）
3. 讀取相關檔案（maps/ + 業務邏輯）
4. 確認資料表結構
5. 開始開發

## 修改檔案前

- grep 查所有引用
- 確認影響範圍
- 記錄到 CURRENT_TASK.md

## 修改檔案後

- TypeScript 零錯誤（npm run type-check）
- ESLint 零警告（npm run lint）
- 測試通過（npm run test）

## 提交前

- git diff 檢查變更
- 確認沒有 console.log
- 確認沒有 TODO/FIXME
- Migration 有註解
- 寫清楚 commit message
```

**實作方式**：

- Git hooks（pre-commit）
- TypeScript 編譯檢查
- 整合 Overnight Dev 系統

---

### Phase 4：Deploy Workflow

**目標**：部署前自動檢查清單

#### Hook: `venturo-pre-deploy`

**檢查清單**：

```markdown
□ TypeScript 零錯誤
□ ESLint 零警告
□ 測試通過
□ Migration 已執行
□ 環境變數設定
□ 資料庫備份
□ RLS policies 檢查
□ API endpoints 檢查
□ 前端 build 成功
□ 後端啟動成功
```

**自動化執行**：

```bash
# 部署前執行
/venturo-deploy check

# 如果全過 → 自動部署
# 如果有失敗 → 停止並通知
```

---

## 🔄 整合現有系統

### 1. 整合 Overnight Dev

- 透過 YAML 觸發 `/venturo-dev`
- coding agent 完成後自動執行 `/venturo-test`

### 2. 整合週會制度

- 每週一檢查所有 agent 是否遵守開發原則
- `/venturo-dev check` 產生報告

### 3. 整合向量庫

- Debug 時先搜「這個錯誤以前遇過嗎」
- Dev 時先搜「這個功能相關的業務邏輯」

### 4. 整合 Telegram 通知

- 測試失敗 → 通知馬修
- 部署成功 → 通知全員
- Debug 完成 → 通知請求者

---

## 📅 實作計畫

### Week 1（2026-03-10 ~ 03-16）

- [ ] **Day 1-2**：建立 `venturo-debug` skill（最優先）
  - check-buttons.sh
  - check-api.sh
  - check-db.sh
- [ ] **Day 3-4**：建立 `venturo-test` skill
  - test-tours.ts
  - test-hr.ts
  - test-report-generator.ts
- [ ] **Day 5-7**：整合現有系統
  - Git hooks
  - Overnight Dev 整合
  - Telegram 通知

### Week 2（2026-03-17 ~ 03-23）

- [ ] 建立 `venturo-dev` skill
- [ ] 建立 `venturo-pre-deploy` hook
- [ ] 全員培訓（週會）
- [ ] 開始使用新工作流

---

## 🎓 教訓記錄

### 今天的誤診（2026-03-10）

**問題**：按鈕失效  
**誤診時間**：2 小時  
**真正原因**：殘留進程  
**誤診路徑**：

1. 看到 Console hydration 錯誤 → 認為是問題根源
2. 研究 localStorage + SSR → 改代碼
3. 清除快取、重啟 → 問題還在
4. 研究 Next.js 16 + Turbopack → 要求重啟電腦
5. 最後發現：只要 `kill -9 81566` 就好了

**正確流程**：

```bash
# 1. 先檢查環境（10 秒）
ps aux | grep next
lsof -ti:3000
kill -9 <pid>
npm run dev

# 2. 如果還有問題，才研究代碼（10 分鐘）
```

**核心教訓**：

- ❌ 不要先入為主相信 Console 錯誤
- ✅ 先檢查系統狀態（進程、port、快取）
- ❌ 不要過度工程化（hydration、SSR 都是煙霧彈）
- ✅ 從簡單到複雜（kill process → restart → 才檢查代碼）

**儲存位置**：

- 記憶庫（已存）
- 這份文件（作為案例）
- `venturo-debug` skill（作為標準流程）

---

## 📚 參考資料

### OpenClaw 官方文檔

- Skills: `/opt/homebrew/lib/node_modules/openclaw/docs/tools/creating-skills.md`
- Hooks: `/opt/homebrew/lib/node_modules/openclaw/docs/automation/hooks.md`
- Multi-Agent: `/opt/homebrew/lib/node_modules/openclaw/docs/concepts/multi-agent.md`

### 內建 Skills 範例

- `coding-agent` — bash + pty:true 模式
- `gh-issues` — 完整的自動化工作流（fetch → spawn → monitor → notify）
- `skill-creator` — 建立新 skill 的 skill

### 團隊知識

- 向量庫：`python3 shared-memory/mem0-search.py`
- 開發原則：CODING_RULES.md（23 rules）
- 會議記錄：`shared-memory/meetings/`

---

## ✅ 下一步

**William，請確認方向**：

1. **優先順序對嗎？**
   - Phase 1: Debug（最急）
   - Phase 2: Test（重要）
   - Phase 3: Dev（長期）
   - Phase 4: Deploy（完整）

2. **要現在開始建立 `venturo-debug` skill 嗎？**
   - 把今天的診斷流程寫成自動化腳本
   - 下次按鈕失效 10 秒搞定

3. **Week 1 目標合理嗎？**
   - Day 1-2: Debug skill
   - Day 3-4: Test skill
   - Day 5-7: 整合

確認後我立即開始建立第一個 skill。

---

_建立者：馬修 🔧_  
_時間：2026-03-10 06:24_  
_狀態：設計完成，等待確認_
