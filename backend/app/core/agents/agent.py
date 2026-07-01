from typing import Annotated, Sequence, TypedDict, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
import json
import os
import sys

try:
    from .tools import (
        get_categories, get_product, search_products,
        list_delivery_cities, check_delivery, create_order, track_order
    )
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    from app.core.agents.tools import (
        get_categories, get_product, search_products,
        list_delivery_cities, check_delivery, create_order, track_order
    )

from app.core.config.settings import settings
from app.core.config.prompts import (
    SUPERVISOR_PROMPT,
    SEARCH_AGENT_PROMPT,
    CHECKOUT_AGENT_PROMPT,
    TRACKING_AGENT_PROMPT,
    VERIFICATION_AGENT_PROMPT
)

# Instantiate the LLM model
llm = ChatOpenAI(model=settings.llm_model, openai_api_key=settings.openai_api_key)
# llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=settings.groq_api_key)

# SQLite path for persistent chat memory
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "kapruka_agent.db")

# Create Worker Agents using create_react_agent
search_agent_node = create_react_agent(
    llm,
    tools=[get_categories, search_products, get_product],
    prompt=SystemMessage(content=SEARCH_AGENT_PROMPT)
)

checkout_agent_node = create_react_agent(
    llm,
    tools=[list_delivery_cities, check_delivery, create_order],
    prompt=SystemMessage(content=CHECKOUT_AGENT_PROMPT)
)

tracking_agent_node = create_react_agent(
    llm,
    tools=[track_order],
    prompt=SystemMessage(content=TRACKING_AGENT_PROMPT)
)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_node: str
    active_worker: str

def trim_messages_for_llm(messages: Sequence[BaseMessage], max_msgs: int = 40) -> list[BaseMessage]:
    """Keep only the last N messages to save tokens. Ensures we start at a HumanMessage."""
    if len(messages) <= max_msgs:
        return list(messages)
    trimmed = list(messages)[-max_msgs:]
    # Drop orphaned AI/Tool messages at the boundary so we always start with a user message
    while trimmed and trimmed[0].type in ("tool", "ai"):
        trimmed.pop(0)
    return trimmed

async def supervisor_node(state: AgentState) -> dict:
    # Ask the LLM which agent to route to
    messages = trim_messages_for_llm(state["messages"])
    
    prompt = [SystemMessage(content=SUPERVISOR_PROMPT)] + messages
    response = await llm.ainvoke(prompt)
    
    route = response.content.strip()
    valid_routes = ["Search", "Checkout", "Tracking"]
    
    if route not in valid_routes:
        route = "Search" # default fallback
        
    return {"active_worker": route}

async def call_search_agent(state: AgentState) -> dict:
    msgs = trim_messages_for_llm(state["messages"])
    response = await search_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

async def call_checkout_agent(state: AgentState) -> dict:
    msgs = trim_messages_for_llm(state["messages"])
    response = await checkout_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

async def call_tracking_agent(state: AgentState) -> dict:
    msgs = trim_messages_for_llm(state["messages"])
    response = await tracking_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

async def verification_node(state: AgentState) -> dict:
    messages = state["messages"]
    
    user_msgs = [m for m in messages if m.type == "human"]
    ai_msgs = [m for m in messages if m.type == "ai"]
    
    if not user_msgs or not ai_msgs:
        return {"next_node": END}
        
    last_user = user_msgs[-1].content
    last_ai = ai_msgs[-1].content
    
    # Skip verification for very short responses (greetings, etc.)
    if len(last_ai.strip()) < 20:
        return {"next_node": END}

    prompt = [
        SystemMessage(content=VERIFICATION_AGENT_PROMPT),
        HumanMessage(content=f"User Request: {last_user}\n\nProposed Response: {last_ai}")
    ]
    
    response = await llm.ainvoke(prompt)
    verification_result = response.content.strip()
    
    if verification_result.upper().startswith("APPROVED"):
        # Pass through unchanged
        return {"next_node": END}
    else:
        # Replace the last AI message with the corrected one (not append)
        # Remove the last AI message from the list, then add corrected one
        updated_messages = []
        replaced = False
        for m in reversed(list(messages)):
            if m.type == "ai" and not replaced:
                # Skip this one — we're replacing it
                replaced = True
                continue
            updated_messages.insert(0, m)
        updated_messages.append(AIMessage(content=verification_result))
        return {
            "messages": updated_messages,
            "next_node": END
        }

def route_from_supervisor(state: AgentState) -> str:
    return state.get("active_worker", "Search")

def route_from_verification(state: AgentState) -> str:
    return state.get("next_node", END)

# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Search", call_search_agent)
workflow.add_node("Checkout", call_checkout_agent)
workflow.add_node("Tracking", call_tracking_agent)
workflow.add_node("Verification", verification_node)

workflow.add_edge(START, "Supervisor")
workflow.add_conditional_edges("Supervisor", route_from_supervisor, {
    "Search": "Search",
    "Checkout": "Checkout",
    "Tracking": "Tracking"
})

workflow.add_edge("Search", "Verification")
workflow.add_edge("Checkout", "Verification")
workflow.add_edge("Tracking", "Verification")

workflow.add_conditional_edges("Verification", route_from_verification)

# shopping_agent is built dynamically with persistent SQLite memory
# Use get_shopping_agent() context manager in the API to get a live instance
async def build_shopping_agent():
    """Build the shopping agent with AsyncSqliteSaver for persistent memory."""
    async with AsyncSqliteSaver.from_conn_string(DB_PATH) as checkpointer:
        agent = workflow.compile(checkpointer=checkpointer)
        return agent, checkpointer

# Also expose a simple in-memory version for quick startup validation
from langgraph.checkpoint.memory import MemorySaver
_memory_saver = MemorySaver()
shopping_agent = workflow.compile(checkpointer=_memory_saver)

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
