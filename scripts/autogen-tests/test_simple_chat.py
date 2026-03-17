"""
AutoGen 測試 1：簡單對話

測試 2 個 agents 能否對話
"""
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    print("🧪 測試 1：簡單對話")
    print("=" * 50)
    
    # 設定 model client
    # TODO: 改成你的 API key
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
        api_key="YOUR_API_KEY"  # 改這裡
    )
    
    # 創建 William AI
    william = AssistantAgent(
        name="William_AI",
        model_client=model_client,
        system_message="你是大祭司 William AI，負責協調帝國任務"
    )
    
    # 創建 Matthew
    matthew = AssistantAgent(
        name="Matthew",
        model_client=model_client,
        system_message="你是馬廄 Matthew，帝國 IT Lead，負責技術實作"
    )
    
    print("\n💬 William AI 問 Matthew：")
    print("Q: Matthew，三紀委託狀態流轉進度如何？")
    print()
    
    # William 問 Matthew（透過 run）
    result = await william.run(
        task="Matthew，三紀委託狀態流轉進度如何？請簡短回報。"
    )
    
    print(f"A: {result}")
    
    await model_client.close()
    
    print("\n✅ 測試完成！")

if __name__ == "__main__":
    asyncio.run(main())
