import asyncio
import os
import sys

# Ensure the backend root directory is in the Python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config.settings import settings
from app.core.agents.agent import shopping_agent

async def main():
    print("Testing shopping agent invoke...")
    print(f"OpenAI API Key: {settings.openai_api_key[:10]}...")
    print(f"LLM Model: {settings.llm_model}")
    
    config = {"configurable": {"thread_id": "test_session"}}
    try:
        response = await shopping_agent.ainvoke(
            {
                "messages": [
                    {"role": "user", "content": "My girlfriend is upset with me"}
                ]
            },
            config=config,
        )
        print("Success!")
        print(response)
    except Exception as e:
        print("Encountered exception:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
