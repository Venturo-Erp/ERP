# Venturo ERP 馬拉松體檢 · 10 位靈魂名冊

**目的**：前 6 份報告是**從模組縱切**（會計/財務/業務...）；這次用**10 位靈魂橫切**、同一份 code 用不同專業眼光掃一遍、找前面漏掉的角度。

**流程**：單核心接力、一位跑完覆盤才派下一位、最後寫總報告 `MARATHON-TOTAL.md`。

**靈魂庫來源**：`~/Projects/靈魂資料夾/agency-agents/`

---

## 10 位靈魂陣容

| # | 視角 | 靈魂 | 檔案 |
|---|---|---|---|
| 1 | 🔒 資安稽核 | **Security Engineer** | `engineering/engineering-security-engineer.md` |
| 2 | 💾 資料庫性能 | **Database Optimizer** | `engineering/engineering-database-optimizer.md` |
| 3 | ⚡ 可靠性 | **SRE** | `engineering/engineering-sre.md` |
| 4 | 🏛 架構審計 | **Software Architect** | `engineering/engineering-software-architect.md` |
| 5 | 📒 會計專業 | **Bookkeeper Controller** | `finance/finance-bookkeeper-controller.md` |
| 6 | 🔄 業務流程 | **Workflow Architect** | `specialized/specialized-workflow-architect.md` |
| 7 | 🧬 資料一致性 | **Data Engineer** | `engineering/engineering-data-engineer.md` |
| 8 | 🎨 UX 架構 | **UX Architect** | `design/design-ux-architect.md` |
| 9 | 🛠 DevOps | **DevOps Automator** | `engineering/engineering-devops-automator.md` |
| 10 | 🗺 新人接手 | **Codebase Onboarding Engineer** | `engineering/engineering-codebase-onboarding-engineer.md` |

---

## 每位的共同規則

**要做**：
- 讀靈魂檔（完整讀）、用該靈魂的**方法論 + 人格 + 專業偏好**檢查 ERP
- 讀前面已跑完的馬拉松報告（如果不是第 1 位）、**不重複報**
- 讀 `docs/PRE_LAUNCH_CLEANUP/audit-2026-04-23/00-INDEX.md` + `BACKLOG.md`、**跳過已列項目**
- 所有發現：檔案路徑 + 行號 + 證據
- 業務語言給老闆看、技術細節在「證據」段

**不要做**：
- ❌ 不改任何檔案
- ❌ 不碰真實租戶（Corner / JINGYAO / YUFEN）資料
- ❌ 不重報 BACKLOG 或前面已記載的項目
- ❌ 不過度推測、沒證據別寫

**輸出**：寫到 `marathon/01-security.md` / `02-db-optimizer.md` / ...

---

## 覆盤節奏

每位跑完、我（主 Claude）寫簡短覆盤、回答 3 問：
1. 這位找到的「真問題」有哪幾條？（過濾掉噪音）
2. 跟前面重複了什麼？（避免堆疊）
3. 有沒有跨視角的新 pattern 浮現？

覆盤段附在該位報告尾、然後派下一位。

---

## 進度表

| # | 靈魂 | 狀態 |
|---|---|---|
| 1 | Security Engineer | ⏳ 待跑 |
| 2 | Database Optimizer | ⏳ |
| 3 | SRE | ⏳ |
| 4 | Software Architect | ⏳ |
| 5 | Bookkeeper Controller | ⏳ |
| 6 | Workflow Architect | ⏳ |
| 7 | Data Engineer | ⏳ |
| 8 | UX Architect | ⏳ |
| 9 | DevOps Automator | ⏳ |
| 10 | Codebase Onboarding Engineer | ⏳ |
| - | MARATHON-TOTAL.md 總報告 | ⏳ |
