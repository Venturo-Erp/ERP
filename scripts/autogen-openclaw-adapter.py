"""
AutoGen + OpenClaw 適配器

讓 AutoGen 能透過 OpenClaw 的 sessions 機制運作
不需要外部 API key
"""
import asyncio
import json
import subprocess
from typing import List, Dict, Any
from autogen_agentchat.agents import BaseChatAgent
from autogen_agentchat.messages import ChatMessage

class OpenClawAgent(BaseChatAgent):
    """
    AutoGen agent 使用 OpenClaw session
    """
    
    def __init__(self, name: str, session_key: str, system_message: str = ""):
        super().__init__(name, "OpenClawAgent")
        self.session_key = session_key
        self.system_message = system_message
        self._chat_history = []
    
    async def on_messages(self, messages: List[ChatMessage], cancellation_token=None) -> ChatMessage:
        """
        接收訊息並回應
        """
        # 取得最後一條訊息
        last_msg = messages[-1]
        prompt = last_msg.content
        
        # 透過 OpenClaw sessions_send 取得回應
        # 實際上這需要透過 OpenClaw tool，但我們在 Python 環境
        # 所以用 subprocess 呼叫 openclaw CLI
        
        try:
            # 組合完整 prompt（包含 system message）
            full_prompt = f"{self.system_message}\n\n{prompt}" if self.system_message else prompt
            
            # 呼叫 OpenClaw（模擬，實際需要真正的整合）
            # 這裡我們用簡化版：直接呼叫對應的 agent
            
            result = subprocess.run(
                ["openclaw", "sessions", "send", 
                 "--session", self.session_key,
                 "--message", full_prompt,
                 "--timeout", "30"],
                capture_output=True,
                text=True,
                timeout=35
            )
            
            if result.returncode == 0:
                response = result.stdout.strip()
            else:
                response = f"[{self.name} 無法回應：{result.stderr}]"
            
        except Exception as e:
            response = f"[{self.name} 錯誤：{str(e)}]"
        
        # 建立回應訊息
        return ChatMessage(
            source=self.name,
            content=response
        )

async def test_openclaw_autogen():
    """
    測試 OpenClaw + AutoGen 整合
    """
    print("🧪 測試 OpenClaw AutoGen 適配器")
    print("=" * 60)
    
    # 建立 agents
    william = OpenClawAgent(
        name="William_AI",
        session_key="agent:william:main",
        system_message="你是 William AI，大祭司。用繁體中文，簡潔。"
    )
    
    matthew = OpenClawAgent(
        name="Matthew",
        session_key="agent:matthew:main",
        system_message="你是 Matthew，IT Lead。用繁體中文，務實。"
    )
    
    print("✅ Agents 建立完成")
    print("\n測試對話...")
    print("-" * 60)
    
    # 測試 1：William 問 Matthew
    msg = ChatMessage(source="user", content="Matthew，需求單系統進度如何？")
    response = await matthew.on_messages([msg])
    
    print(f"\n【William AI】Matthew，需求單系統進度如何？")
    print(f"\n【{response.source}】{response.content}")
    
    print("\n" + "=" * 60)
    print("✅ 測試完成")

if __name__ == "__main__":
    asyncio.run(test_openclaw_autogen())
