# Knowledge Work Plugins

**來源**：https://github.com/anthropics/knowledge-work-plugins  
**星數**：10,281 ⭐  
**作者**：Anthropic（官方）  
**發現日期**：2026-03-24  
**發現者**：William

---

## 📋 概要

Anthropic 官方開源的 Claude 插件庫，專為知識工作者設計。
可用於 **Claude Cowork** 和 **Claude Code**。

---

## 🎯 用途

將 Claude 變成特定角色的專家：
- 定義工作流程
- 連接外部工具（CRM、專案管理、數據倉庫等）
- 暴露 slash commands
- 讓團隊獲得更一致的輸出

---

## 📦 11 個插件

| 插件 | 用途 | 整合工具 |
|------|------|----------|
| **productivity** | 任務、日曆、日常工作流 | Slack, Notion, Asana, Linear, Jira |
| **sales** | 客戶研究、電話準備、競爭分析 | HubSpot, Close, Clay, ZoomInfo |
| **customer-support** | 工單分類、回覆草稿、知識庫 | Intercom, HubSpot, Guru |
| **product-management** | 規格撰寫、路線圖、用戶研究 | Linear, Figma, Amplitude, Pendo |
| **marketing** | 內容草稿、品牌聲音、競爭簡報 | Canva, Figma, HubSpot, Ahrefs |
| **legal** | 合約審查、NDA、合規、風險評估 | Box, Egnyte, Jira |
| **finance** | 日記帳、對帳、財務報表、審計支援 | Snowflake, Databricks, BigQuery |
| **data** | SQL 查詢、統計分析、儀表板 | Snowflake, Databricks, Hex |
| **enterprise-search** | 跨工具搜索（郵件、聊天、文檔） | Slack, Notion, Guru, Jira |
| **bio-research** | 生命科學研發（文獻、基因組分析） | PubMed, BioRender, ChEMBL |
| **cowork-plugin-management** | 建立/客製化插件 | — |

---

## 🏗️ 插件結構

```
plugin-name/
├── .claude-plugin/plugin.json  # Manifest
├── .mcp.json                   # 工具連接（MCP）
├── commands/                   # Slash commands
└── skills/                     # 領域知識（Claude 自動引用）
```

- **Skills**：領域專業、最佳實踐、工作流程（Markdown）
- **Commands**：明確觸發的動作（如 `/finance:reconciliation`）
- **Connectors**：透過 MCP 連接外部工具

**特點**：純文件（Markdown + JSON），無需程式碼、基礎設施或建置步驟。

---

## 🔧 安裝方式

```bash
# 先加入 marketplace
claude plugin marketplace add anthropics/knowledge-work-plugins

# 安裝特定插件
claude plugin install sales@knowledge-work-plugins
```

---

## 💡 對 Venturo 的價值

### 可參考的設計理念
1. **Skills + Commands 架構** — 類似我們的 OpenClaw skills
2. **MCP 連接器** — 可用於連接 Supabase、LINE Bot 等
3. **純文件設計** — 易於版本控制和協作

### 可能的應用
- 參考 **finance** 插件設計會計系統的 AI 助手
- 參考 **customer-support** 設計客服工作流
- 參考 **product-management** 設計需求單處理流程

---

## 🔗 相關資源

- [Claude Cowork 產品頁](https://claude.com/product/cowork)
- [Claude Code 產品頁](https://claude.com/product/claude-code)
- [MCP 協議](https://modelcontextprotocol.io/)
- [插件市場](https://claude.com/plugins/)

---

**更新時間**：2026-03-24  
**維護者**：Matthew
