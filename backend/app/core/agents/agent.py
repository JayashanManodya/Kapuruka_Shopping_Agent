from typing import Annotated, Sequence, TypedDict, Literal, Union, Any
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import create_react_agent

from langchain_openai import ChatOpenAI
import json
import os
import sys
from datetime import datetime

try:
    from .tools import (
        get_categories, get_product, search_products, manage_cart,
        list_delivery_cities, check_delivery, create_order, track_order
    )
except ImportError:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    from app.core.agents.tools import (
        get_categories, get_product, search_products, manage_cart,
        list_delivery_cities, check_delivery, create_order, track_order
    )

from app.core.config.settings import settings
from app.core.config.prompts import (
    SUPERVISOR_PROMPT,
    SEARCH_AGENT_PROMPT,
    CHECKOUT_AGENT_PROMPT,
    TRACKING_AGENT_PROMPT,
)
from app.models.response_models import parse_agent_response, AgentResponse

# Instantiate the LLM model configured for JSON output
llm = ChatOpenAI(
    model=settings.llm_model,
    openai_api_key=settings.openai_api_key
).bind(response_format={"type": "json_object"})

# Separate LLM instance for Supervisor routing (plain text output)
supervisor_llm = ChatOpenAI(
    model=settings.llm_model,
    openai_api_key=settings.openai_api_key
)

# Create Worker Agents using create_react_agent
search_agent_node = create_react_agent(
    llm,
    tools=[get_categories, search_products, get_product, manage_cart],
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
    assigned_agent: str
    language: str
    retries: int
    structured_response: Union[dict[str, Any], None]

def trim_messages_for_llm(messages: Sequence[BaseMessage], max_msgs: int = 15) -> list[BaseMessage]:
    """Keep only the last N messages to save tokens. Ensures we start at a HumanMessage and preserves SystemMessages."""
    system_msgs = [m for m in messages if m.type == "system"]
    other_msgs = [m for m in messages if m.type != "system"]
    
    if len(other_msgs) <= max_msgs:
        return system_msgs + other_msgs
        
    trimmed = other_msgs[-max_msgs:]
    # Drop orphaned AI/Tool messages at the boundary so we always start with a user message
    while trimmed and trimmed[0].type in ("tool", "ai"):
        trimmed.pop(0)
        
    return system_msgs + trimmed

def log_messages(node_name: str, messages: Sequence[BaseMessage]):
    if not settings.log:
        return
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*50}\n[{current_time}] [{node_name}] State: {len(messages)} messages\n{'='*50}")
    for i, msg in enumerate(messages):
        content = msg.content
        if isinstance(content, list):
            content = "[List Content]"
        
        tool_call_info = ""
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            tool_call_info = f" | Tools: {[t['name'] for t in msg.tool_calls]}"
            
        print(f"[{i}] {msg.type.upper()}{tool_call_info}:\n{content}\n{'-'*30}")

def _format_worker_response(messages: list[BaseMessage]) -> dict:
    """Validate and format the final worker agent AI message as a Pydantic structured output JSON."""
    if not messages:
        return {"messages": messages, "structured_response": None}
    
    last_msg = messages[-1]
    if isinstance(last_msg, AIMessage) and last_msg.content:
        parsed_model = parse_agent_response(last_msg.content)
        json_str = parsed_model.model_dump_json()
        messages[-1] = AIMessage(content=json_str, id=getattr(last_msg, "id", None))
        return {"messages": messages, "structured_response": parsed_model.model_dump()}
        
    return {"messages": messages, "structured_response": None}

async def supervisor_node(state: AgentState) -> dict:
    # Ask the LLM which agent to route to
    log_messages("Supervisor", state["messages"])
    messages = trim_messages_for_llm(state["messages"])
    
    prompt = [SystemMessage(content=SUPERVISOR_PROMPT)] + messages
    response = await supervisor_llm.ainvoke(prompt)
    
    route = response.content.strip()
    valid_routes = ["Search", "Checkout", "Tracking"]
    
    if route not in valid_routes:
        # Fallback parsing if JSON response format was returned
        parsed = parse_agent_response(route)
        route = parsed.message.strip() if parsed.message in valid_routes else "Search"
        
    if route not in valid_routes:
        route = "Search" # default fallback
        
    return {"assigned_agent": route, "retries": 0}

async def call_search_agent(state: AgentState) -> dict:
    log_messages("Search Agent", state["messages"])
    msgs = trim_messages_for_llm(state["messages"])
    response = await search_agent_node.ainvoke({"messages": msgs})
    return _format_worker_response(response["messages"])

def _get_text(content) -> str:
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        return " ".join([p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"])
    return str(content)

def _is_confirming_order_summary(messages) -> bool:
    """Check if the user's last message is a 'yes/confirm' to an order_summary shown just before it."""
    ai_msgs = [m for m in messages if getattr(m, "type", "") == "ai"]
    human_msgs = [m for m in messages if getattr(m, "type", "") == "human"]
    if not ai_msgs or not human_msgs:
        return False
    last_human = _get_text(human_msgs[-1].content).strip().lower()
    is_affirmation = any(w in last_human for w in ["yes", "confirm", "proceed", "place", "create order", "go ahead", "ok", "sure", "yep", "yup"])
    if not is_affirmation:
        return False
    # Check if the last meaningful AI message was an order_summary
    for m in reversed(ai_msgs):
        content = m.content.strip()
        if '"type": "order_summary"' in content or '"type":"order_summary"' in content:
            return True
        if content and len(content) > 20:
            return False
    return False

async def call_checkout_agent(state: AgentState) -> dict:
    log_messages("Checkout Agent", state["messages"])
    msgs = trim_messages_for_llm(state["messages"])
    response = await checkout_agent_node.ainvoke({"messages": msgs})
    return _format_worker_response(response["messages"])

async def call_tracking_agent(state: AgentState) -> dict:
    log_messages("Tracking Agent", state["messages"])
    msgs = trim_messages_for_llm(state["messages"])
    response = await tracking_agent_node.ainvoke({"messages": msgs})
    return _format_worker_response(response["messages"])

def route_from_supervisor(state: AgentState) -> str:
    return state.get("assigned_agent", "Search")

# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Search", call_search_agent)
workflow.add_node("Checkout", call_checkout_agent)
workflow.add_node("Tracking", call_tracking_agent)

workflow.add_edge(START, "Supervisor")

workflow.add_conditional_edges(
    "Supervisor",
    route_from_supervisor
)

workflow.add_edge("Search", END)
workflow.add_edge("Checkout", END)
workflow.add_edge("Tracking", END)

# Compile the workflow completely statelessly. 
shopping_agent = workflow.compile()

def serialize_messages(messages) -> str:
    """Serialize LangChain core message list to a clean JSON-serializable list of dictionaries."""
    serialized = []
    for msg in messages:
        role = msg.type
        if role == "human":
            role = "user"
        elif role == "ai":
            role = "assistant"
            
        content = msg.content
        image_base64 = None
        
        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict):
                    if "text" in part:
                        text_parts.append(part["text"])
                    elif part.get("type") == "image_url":
                        image_base64 = part["image_url"]["url"]
                elif hasattr(part, "text"):
                    text_parts.append(part.text)
                elif isinstance(part, str):
                    text_parts.append(part)
            content = "\n".join(text_parts)
            
        msg_dict = {
            "role": role,
            "content": content,
        }
        
        if image_base64:
            msg_dict["image_base64"] = image_base64
        
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            msg_dict["tool_calls"] = msg.tool_calls
            
        if role == "tool":
            if hasattr(msg, "tool_call_id"):
                msg_dict["tool_call_id"] = msg.tool_call_id
            if hasattr(msg, "name"):
                msg_dict["name"] = msg.name
                
        serialized.append(msg_dict)
    return json.dumps(serialized, indent=2)
