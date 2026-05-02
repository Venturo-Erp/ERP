# Feature: Overnight Dev（半夜自動寫程式碼）

## Status: Skill 85% 完成，未實戰測試

## 設計日期

2026-03-05

---

## 核心概念

**問題**：開發佔用白天工作時間
**解法**：William 睡覺前定義需求 → AI 半夜自動寫 code → 早上起床就能用

## 工作流程

```
晚上：定義需求（對話或 YAML）→ 排程 23:00 執行
半夜：AI 自動寫 code、測試、Git commit
早上：收到晨報 → 測試 → 繼續下一階段
```

---

## 已完成

| 檔案                           | 功能              | 狀態                 |
| ------------------------------ | ----------------- | -------------------- |
| SKILL.md                       | Skill 說明        | ✅                   |
| scripts/schedule.js            | 排程任務          | ✅                   |
| scripts/executor.js            | 執行開發          | ⚠️ 待整合 Claude CLI |
| scripts/morning-report.js      | 產生晨報          | ✅                   |
| lib/task-parser.js             | 解析 YAML         | ✅                   |
| lib/code-generator.js          | 呼叫 coding agent | ⚠️ 待測試            |
| templates/overnight-tasks.yaml | 任務範本          | ✅                   |

位置：`~/.openclaw/workspace-william/skills/overnight-dev/`

---

## 還沒做

- [ ] code-generator.js 整合 Claude CLI 正確參數
- [ ] 基本功能測試（schedule → execute → report）
- [ ] 實戰測試（一個簡單任務跑一晚看結果）
- [ ] 通知整合（透過播報員 Bot 發晨報）
- [ ] 從對話產生任務（30% 完成）

## 前置條件

- Claude Code CLI 已安裝（/opt/homebrew/bin/claude, v2.1.69）
- 需要測試一次完整流程才能投入使用

## 與 /ai 系統的整合

Overnight Dev 執行時：

1. 讀 `ai/maps/` + `ai/rules/` 了解系統
2. 讀 `ai/tasks/CURRENT_TASK.md` 知道要做什麼
3. 完成後寫 `ai/reports/OPENCLAW_REPORT.md`
