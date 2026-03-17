"""
AutoGen 測試 2：開會（GroupChat）

測試 3 個 agents 能否開會討論
"""
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    print("🧪 測試 2：帝國技術會議")
    print("=" * 50)
    
    # 設定 model client
    # TODO: 改成你的 API key
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
        api_key="YOUR_API_KEY"  # 改這裡
    )
    
    # 創建 3 個 agents
    william = AssistantAgent(
        name="William_AI",
        model_client=model_client,
        system_message="""
        你是大祭司 William AI，負責協調任務和主持會議。
        風格：簡潔、有決策力。
        """
    )
    
    matthew = AssistantAgent(
        name="Matthew",
        model_client=model_client,
        system_message="""
        你是馬廄 Matthew，帝國 IT Lead，負責技術實作。
        風格：技術、具體、實際。
        """
    )
    
    leon = AssistantAgent(
        name="Leon",
        model_client=model_client,
        system_message="""
        你是獅子 Leon，帝國營運主管，負責業務流程。
        風格：業務導向、關注使用者體驗。
        """
    )
    
    # 創建會議（RoundRobin = 輪流發言）
    team = RoundRobinGroupChat(
        participants=[william, matthew, leon],
        max_turns=6  # 最多 6 輪對話（每人 2 次）
    )
    
    print("\n📋 會議議題：三紀委託狀態流轉進度檢討")
    print("👥 參與者：William AI、Matthew、Leon")
    print()
    
    # 開會
    await Console(
        team.run_stream(
            task="""
            帝國技術會議開始。
            
            議題：三紀委託狀態流轉進度檢討
            
            流程：
            1. Matthew 先報告技術進度（2-3 句話）
            2. Leon 說明業務需求（2-3 句話）
            3. William AI 總結下一步行動
            
            請保持簡潔，每人發言不超過 3 句話。
            """
        )
    )
    
    await model_client.close()
    
    print("\n✅ 會議結束！")

if __name__ == "__main__":
    asyncio.run(main())
