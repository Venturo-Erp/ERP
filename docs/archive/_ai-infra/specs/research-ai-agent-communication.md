# 研究：AI 之間怎麼溝通？

> 2026-03-06 深度調查
> 目的：找出 AI 會議系統的最佳實作方式

---

## 現有方案總覽

### 1. Google A2A Protocol（Agent-to-Agent）⭐ 最正規

- **是什麼**：Google 主導的開放協定，Linux Foundation 託管
- **怎麼運作**：JSON-RPC 2.0 over HTTP(S)
- **核心概念**：
  - Agent Card（名片）— 每個 AI 公開自己的能力
  - Task（任務）— AI 之間互相派任務
  - 支援同步/串流/非同步三種模式
- **優點**：標準化、有 Python/JS SDK、50+ 大公司支持
- **缺點**：偏企業級，對我們來說太重了
- **適合度**：⭐⭐⭐ 概念參考，不需要完整導入
- **GitHub**：github.com/a2aproject/A2A

### 2. Microsoft AutoGen ⭐ 最接近我們要的

- **是什麼**：多 AI 群聊框架
- **怎麼運作**：定義多個 agent → 放進 group chat → 自動輪流發言
- **核心概念**：
  - ConversableAgent（可對話的 AI）
  - GroupChat（群聊，多個 agent 在裡面討論）
  - GroupChatManager（管理發言順序）
  - 支援辯論模式（一個提議、一個反駁、一個裁決）
- **優點**：直接支援我們要的「多 AI 開會辯論」
- **缺點**：Python 為主，要整合進 Next.js 需要包一層
- **適合度**：⭐⭐⭐⭐⭐ 核心參考
- **GitHub**：github.com/microsoft/autogen

### 3. CrewAI

- **是什麼**：AI 團隊框架
- **怎麼運作**：定義角色（Agent）+ 任務（Task）+ 流程（Process）
- **核心概念**：
  - 每個 Agent 有角色、目標、背景故事
  - 任務按順序或平行執行
  - Agent 之間可以委派任務
- **優點**：角色定義很好用
- **缺點**：偏「任務執行」而非「討論辯論」
- **適合度**：⭐⭐⭐ 角色設計參考

### 4. OpenAI Agents SDK（前身 Swarm）

- **是什麼**：OpenAI 官方的多 agent 框架
- **怎麼運作**：Agent + Handoff（交棒）
- **核心概念**：一個 agent 處理完交給下一個
- **缺點**：只支援 OpenAI 模型，不支援「同時討論」
- **適合度**：⭐⭐ 概念不同

### 5. Moltbook

- **是什麼**：AI 社群網站（Reddit for AI）
- **怎麼運作**：AI agent 註冊帳號 → 發文留言
- **適合度**：⭐ 概念有趣但太不同

---

## 對我們的結論

### 我們要做的事

「讓 3-7 個 AI 在會議室裡同時討論一個主題，產出結論和行動項目」

### 最接近的方案：AutoGen 的 GroupChat

AutoGen 的群聊模式幾乎就是我們要的：

- 多個 agent 在同一個聊天室
- 有發言順序管理
- 支援辯論（正方/反方/裁判）
- 自動產出結論

### 建議架構

```
┌──────────────┐
│  ERP 會議室 UI │  ← Next.js 前端（已完成）
└──────┬───────┘
       │ WebSocket / Supabase Realtime
┌──────▼───────┐
│  Meeting API  │  ← Next.js 後端
└──────┬───────┘
       │ 呼叫 Python service
┌──────▼───────┐
│ AutoGen 引擎  │  ← Python，管理多 AI 對話
│  GroupChat    │
│  Manager     │
└──────┬───────┘
       │ 呼叫各個 AI
┌──────▼───────┐
│ Anthropic API │  ← 用訂閱額度
│ (Claude)      │
└──────────────┘
```

### 或者更簡單的方式

不用 AutoGen，自己寫一個輕量版：

```
┌──────────────┐
│  ERP 會議室 UI │
└──────┬───────┘
       │ API call
┌──────▼───────┐
│  Meeting API  │  ← 管理發言順序
│  (Node.js)    │    每輪把之前的對話傳給下一個 AI
└──────┬───────┘
       │ Anthropic Messages API
┌──────▼───────┐
│ Claude API    │  ← 每個 AI 用不同的 system prompt
│ + 人格設定    │    但其實是同一個 API
└──────────────┘
```

**這個最簡單**：不需要 Python、不需要額外框架。
每個「虛擬 AI」就是一個不同的 system prompt + 對話歷史。
Meeting API 負責管理「誰先說」「說完換誰」。

---

## 下一步建議

1. **先解決 API 認證問題** — ERP 後端能呼叫 Claude（透過 Gateway 或直接 API key）
2. **用簡單版開始** — Node.js + 不同 system prompt，不引入額外框架
3. **參考 AutoGen 的 GroupChat 邏輯** — 發言順序、輪次管理、結論產生
4. **參考 A2A 的 Agent Card** — 每個 AI 的能力描述格式
5. **參考 CrewAI 的角色定義** — 個性、目標、背景故事

---

## 參考連結

- A2A Protocol: github.com/a2aproject/A2A
- AutoGen: github.com/microsoft/autogen
- CrewAI: github.com/crewai/crewai
- OpenAI Agents SDK: github.com/openai/openai-agents-python
- Moltbook: moltbook.com
