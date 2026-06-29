from langchain_groq import ChatGroq
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
import json
import os
import sys

try:
    from .tools import get_categories, get_product, search_products
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    from app.core.agents.tools import get_categories, get_product, search_products

from app.core.config.settings import settings
from app.core.config.prompts import SYSTEM_PROMPT

# Instantiate the LLM model using Groq settings configured via BaseSettings
llm = ChatGroq(model=settings.llm_model, groq_api_key=settings.groq_api_key)

# In-memory checkpointer for thread session management
memory = MemorySaver()

# Compile the agent state graph
shopping_agent = create_agent(
    model=llm,
    tools=[get_categories, search_products, get_product],
    system_prompt=SYSTEM_PROMPT,
    checkpointer=memory,
)

def serialize_messages(messages) -> str:
    """Serialize LangChain core message list to a clean JSON-serializable list of dictionaries."""
    serialized = []
    for msg in messages:
        role = msg.type
        if role == "human":
            role = "user"
        elif role == "ai":
            role = "assistant"
            
        msg_dict = {
            "role": role,
            "content": msg.content,
        }
        
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            msg_dict["tool_calls"] = msg.tool_calls
            
        if role == "tool":
            if hasattr(msg, "tool_call_id"):
                msg_dict["tool_call_id"] = msg.tool_call_id
            if hasattr(msg, "name"):
                msg_dict["name"] = msg.name
                
        serialized.append(msg_dict)
    return json.dumps(serialized, indent=2)
