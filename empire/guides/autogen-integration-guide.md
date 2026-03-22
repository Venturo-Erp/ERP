# AutoGen 整合指南

**目標**：讓帝國 agents 能用 AutoGen 開會、協作、指派任務

**負責人**：Matthew（馬廄）  
**協助者**：William AI（大祭司）  
**時程**：1-2 週

---

## 🎯 為什麼用 AutoGen

**3 大功能原生支援**：

1. ✅ **GroupChat** — agents 開會討論
2. ✅ **Nested Chat** — 工作流（順序執行任務）
3. ✅ **AgentTool** — 指派任務給專家

**優點**：

- Microsoft 出品，穩定
- 100% 開源，免費
- 社群活躍
- 不用自己開發通訊系統

---

## 📦 安裝

### 環境需求

- Python 3.10+
- OpenAI/Anthropic API key

### 安裝指令

```bash
# 基礎套件
pip install autogen-agentchat autogen-ext

# OpenAI 支援（如果用 GPT）
pip install autogen-ext[openai]

# Anthropic 支援（如果用 Claude）
# AutoGen 支援 Claude 透過 OpenAI-compatible endpoint
```

### 驗證安裝

```bash
python -c "import autogen; print(autogen.__version__)"
```

---

## 🧪 測試 1：簡單對話

**目標**：2 個 agents 對話

**檔案**：`test_simple_chat.py`

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    # 設定 model client
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",  # 或 "claude-sonnet-4" (透過 OpenAI-compatible endpoint)
        api_key="YOUR_API_KEY"
    )

    # 創建 William AI
    william = AssistantAgent(
        name="William_AI",
        model_client=model_client,
        system_message="你是大祭司，負責協調任務"
    )

    # 創建 Matthew
    matthew = AssistantAgent(
        name="Matthew",
        model_client=model_client,
        system_message="你是 IT Lead，負責技術實作"
    )

    # William 問 Matthew
    result = await william.run(
        task="Matthew，三紀委託狀態流轉進度如何？"
    )

    print(result)

    await model_client.close()

asyncio.run(main())
```

**執行**：

```bash
python test_simple_chat.py
```

**預期輸出**：

```
Matthew: 三紀委託狀態流轉目前已完成 Email 整合...
```

---

## 🧪 測試 2：開會（GroupChat）

**目標**：3 個 agents 開會討論

**檔案**：`test_meeting.py`

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
        api_key="YOUR_API_KEY"
    )

    # 創建 3 個 agents
    william = AssistantAgent(
        name="William_AI",
        model_client=model_client,
        system_message="你是大祭司，負責協調任務和主持會議"
    )

    matthew = AssistantAgent(
        name="Matthew",
        model_client=model_client,
        system_message="你是 IT Lead，負責技術實作"
    )

    leon = AssistantAgent(
        name="Leon",
        model_client=model_client,
        system_message="你是營運主管，負責業務流程"
    )

    # 創建會議（RoundRobin = 輪流發言）
    team = RoundRobinGroupChat(
        participants=[william, matthew, leon],
        max_turns=10  # 最多 10 輪對話
    )

    # 開會
    await Console(
        team.run_stream(
            task="""
            帝國技術會議開始。
            議題：三紀委託狀態流轉進度檢討。
            Matthew 先報告技術進度。
            Leon 說明業務需求。
            最後 William AI 總結下一步行動。
            """
        )
    )

    await model_client.close()

asyncio.run(main())
```

**執行**：

```bash
python test_meeting.py
```

**預期輸出**：

```
William_AI: 帝國技術會議開始...
Matthew: 技術進度報告：Email 整合已完成...
Leon: 業務需求：建議加上進度追蹤...
William_AI: 總結：Matthew 加上進度追蹤功能...
```

---

## 🧪 測試 3：指派任務（AgentTool）

**目標**：William AI 自動決定要叫誰

**檔案**：`test_task_assignment.py`

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.tools import AgentTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
        api_key="YOUR_API_KEY"
    )

    # 專家 agents
    matthew = AssistantAgent(
        name="Matthew",
        model_client=model_client,
        system_message="你是技術專家，解決程式問題",
        description="技術實作專家"
    )

    leon = AssistantAgent(
        name="Leon",
        model_client=model_client,
        system_message="你是業務專家，解決流程問題",
        description="業務流程專家"
    )

    # 把專家包成 tools
    matthew_tool = AgentTool(matthew, return_value_as_last_message=True)
    leon_tool = AgentTool(leon, return_value_as_last_message=True)

    # William AI 有這些 tools
    william = AssistantAgent(
        name="William_AI",
        model_client=model_client,
        system_message="你是大祭司，協調任務。有技術問題叫 Matthew，有業務問題叫 Leon。",
        tools=[matthew_tool, leon_tool],
        model_client_stream=True,
        max_tool_iterations=5
    )

    # 技術問題 → 自動叫 Matthew
    print("=== 測試 1：技術問題 ===")
    result1 = await william.run(
        task="Email 發送整合要怎麼做？"
    )
    print(result1)

    # 業務問題 → 自動叫 Leon
    print("\n=== 測試 2：業務問題 ===")
    result2 = await william.run(
        task="委託單的簽核流程應該怎麼設計？"
    )
    print(result2)

    await model_client.close()

asyncio.run(main())
```

**執行**：

```bash
python test_task_assignment.py
```

**預期輸出**：

```
=== 測試 1：技術問題 ===
[William_AI 呼叫 Matthew]
Matthew: Email 發送可以用 Resend API...

=== 測試 2：業務問題 ===
[William_AI 呼叫 Leon]
Leon: 簽核流程建議分三層...
```

---

## 🔧 與 OpenClaw 整合

**目標**：讓 OpenClaw agents 能用 AutoGen

### 方案 A：OpenClaw → AutoGen（推薦）

```python
# OpenClaw agent 呼叫 AutoGen agents
from empire_autogen import call_autogen_meeting

# 在 OpenClaw agent 的程式碼裡
result = call_autogen_meeting(
    topic="三紀進度討論",
    participants=["william_ai", "matthew", "leon"]
)
```

### 方案 B：AutoGen → OpenClaw

```python
# AutoGen agent 呼叫 OpenClaw tool
from autogen_agentchat.tools import FunctionTool

def query_erp_data(query: str) -> str:
    # 呼叫 Supabase 或 MCP
    return "查詢結果..."

erp_tool = FunctionTool(query_erp_data, description="查詢 ERP 資料")

william = AssistantAgent(
    name="William_AI",
    tools=[erp_tool]
)
```

---

## 📝 整合清單

### Week 1：基礎測試

- [ ] 安裝 AutoGen
- [ ] 測試 1：簡單對話 ✅
- [ ] 測試 2：開會（3 agents）✅
- [ ] 測試 3：指派任務 ✅

### Week 2：OpenClaw 整合

- [ ] 建立 `empire_autogen.py` 模組
- [ ] OpenClaw agents 能呼叫 AutoGen 會議
- [ ] 儲存會議記錄到 Supabase
- [ ] UI 顯示會議記錄

---

## 🚨 常見問題

### Q1: Claude API 怎麼接？

AutoGen 原生支援 OpenAI，但可以用 OpenAI-compatible endpoint：

```python
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(
    model="claude-sonnet-4",
    api_key="YOUR_ANTHROPIC_KEY",
    base_url="https://api.anthropic.com/v1"  # 透過 proxy
)
```

或用 LiteLLM proxy：

```bash
# 安裝 LiteLLM
pip install litellm[proxy]

# 啟動 proxy
litellm --model claude-sonnet-4

# AutoGen 連到 proxy
model_client = OpenAIChatCompletionClient(
    model="claude-sonnet-4",
    base_url="http://localhost:4000"
)
```

### Q2: 會議記錄怎麼存？

```python
# 會議結束後
meeting_messages = team.messages

# 存到 Supabase
supabase.table("meeting_records").insert({
    "topic": "三紀進度",
    "participants": ["william_ai", "matthew", "leon"],
    "messages": meeting_messages,
    "created_at": "2026-03-17"
})
```

### Q3: 成本高嗎？

- AutoGen 本身免費
- 只付 LLM API（跟現在一樣）
- 會議可能多用一些 tokens（agents 互相對話）
- 建議先用小規模測試

---

## 📚 參考資料

- [AutoGen 官方文件](https://microsoft.github.io/autogen/)
- [AutoGen GitHub](https://github.com/microsoft/autogen)
- [AgentChat 快速開始](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/quickstart.html)
- [GroupChat 範例](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/group-chat.html)

---

## 🆘 需要協助

**遇到問題**：

1. 先查 [FAQ](https://docs.deepwisdom.ai/main/en/guide/faq.html)
2. 透過帝國信箱找大祭司
3. GitHub Issues

---

**開始時間**：2026-03-17  
**預計完成**：2 週後（2026-03-31）

**加油，馬廄！** 🔧
