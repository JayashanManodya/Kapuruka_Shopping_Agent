from typing import Annotated, Sequence, TypedDict, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import create_react_agent

from langchain_openai import ChatOpenAI
# from langchain_groq import ChatGroq
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
    VERIFICATION_AGENT_PROMPT
)

# Instantiate the LLM model
llm = ChatOpenAI(model=settings.llm_model, openai_api_key=settings.openai_api_key)
# llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=settings.groq_api_key)


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

async def supervisor_node(state: AgentState) -> dict:
    # Ask the LLM which agent to route to
    log_messages("Supervisor", state["messages"])
    messages = trim_messages_for_llm(state["messages"])
    
    prompt = [SystemMessage(content=SUPERVISOR_PROMPT)] + messages
    response = await llm.ainvoke(prompt)
    
    route = response.content.strip()
    valid_routes = ["Search", "Checkout", "Tracking"]
    
    if route not in valid_routes:
        route = "Search" # default fallback
        
    return {"assigned_agent": route, "retries": 0}

async def call_search_agent(state: AgentState) -> dict:
    log_messages("Search Agent", state["messages"])
    msgs = trim_messages_for_llm(state["messages"])
    response = await search_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

def _get_text(content) -> str:
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        return " ".join([p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"])
    return str(content)

def _has_checkout_details(messages) -> bool:
    """Check if the user has already provided the essential checkout fields (phone + date + city/address)."""
    import re
    # Scan ALL human messages — not just the trimmed window
    human_text = " ".join(
        _get_text(m.content) for m in messages if getattr(m, "type", "") == "human"
    ).lower()

    # Phone: Sri Lankan +94 format (with or without spaces/dashes) or local 07x format
    has_phone = bool(re.search(
        r'(?:\+94|0)[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d',
        human_text
    ))
    # Date: YYYY-MM-DD, YYYY/MM/DD, or natural like "2026 june 24", "24 june", "today", "tomorrow"
    has_date = bool(re.search(
        r'20\d{2}[-/]\d{2}[-/]\d{2}|'
        r'20\d{2}\s+[a-z]{3,9}\s+\d{1,2}|'
        r'\d{1,2}(st|nd|rd|th)?\s+[a-z]{3,9}\s+(20\d{2})?|'
        r'[a-z]{3,9}\s+\d{1,2}(st|nd|rd|th)?(\s+20\d{2})?|'
        r'\b(today|tomorrow)\b', 
        human_text
    ))
    # Location: city name or address keyword (optional for the gatekeeper, let LLM handle typos)
    has_location = bool(re.search(
        r'\b(colombo|kandy|galle|matara|kurunegala|jaffna|negombo|rath?napura|rattnapura|badulla|'
        r'kalutara|moratuwa|gampaha|anuradhapura|batticaloa|trincomalee|puttalam|'
        r'street|road|lane|mawatha|avenue|no\.|prince|deliver to|address|city)\b',
        human_text
    ))
    # As long as they provided at least some checkout-like details (like a phone number or date),
    # let the LLM handle the rest (including misspelled cities or missing fields).
    return has_phone or has_date or has_location


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

    # Run these checks on ALL messages (not trimmed), so details given earlier aren't missed
    all_messages = list(state["messages"])

    # If user is confirming an order summary, allow the LLM to proceed with create_order
    if _is_confirming_order_summary(all_messages):
        response = await checkout_agent_node.ainvoke({"messages": msgs})
        return {"messages": response["messages"]}

    # All requests go straight to the LLM now, letting the agent handle missing details directly.

    response = await checkout_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

async def call_tracking_agent(state: AgentState) -> dict:
    log_messages("Tracking Agent", state["messages"])
    msgs = trim_messages_for_llm(state["messages"])
    response = await tracking_agent_node.ainvoke({"messages": msgs})
    return {"messages": response["messages"]}

async def verification_node(state: AgentState) -> dict:
    log_messages("Verification", state["messages"])
    messages = state["messages"]
    
    user_msgs = [m for m in messages if m.type == "human"]
    ai_msgs = [m for m in messages if m.type == "ai"]
    
    if not user_msgs or not ai_msgs:
        return {"next_node": END}
        
    last_user = _get_text(user_msgs[-1].content)
    last_ai = ai_msgs[-1].content
    
    # Skip verification for very short responses (greetings, etc.)
    if len(last_ai.strip()) < 20:
        return {"next_node": END}

    # Collect tool call evidence from recent messages so the verifier
    # can distinguish real tool-sourced data from hallucinations.
    tool_evidence_parts = []
    for m in messages:
        if hasattr(m, "tool_calls") and m.tool_calls:
            for tc in m.tool_calls:
                tool_evidence_parts.append(f"Tool Called: {tc.get('name', 'unknown')}, Args: {json.dumps(tc.get('args', {}))}")
        if m.type == "tool":
            tool_name = getattr(m, "name", "unknown_tool")
            # Include a truncated snippet of the tool result as evidence
            result_snippet = str(m.content)[:10000]
            tool_evidence_parts.append(f"Tool Result ({tool_name}): {result_snippet}")

    tool_evidence = "\n".join(tool_evidence_parts) if tool_evidence_parts else "No tool calls were made."

    verification_input = (
        f"User Request: {last_user}\n\n"
        f"Preferred Language: {state.get('language', 'English')}\n\n"
        f"Proposed Response: {last_ai}\n\n"
        f"Tool Call Evidence:\n{tool_evidence}"
    )

    prompt = [
        SystemMessage(content=VERIFICATION_AGENT_PROMPT),
        HumanMessage(content=verification_input)
    ]
    
    response = await llm.ainvoke(prompt)
    verification_result = response.content.strip()
    
    if verification_result.upper().startswith("APPROVED"):
        # Pass through unchanged
        return {"next_node": END}
        
    if verification_result.upper().startswith("REJECTED:"):
        current_retries = state.get("retries", 0)
        if current_retries < 2:
            warning = HumanMessage(content=f"System Verification Failed: {verification_result}. Please correct your response and try again. Ensure you only use data from tool evidence.")
            return {
                "messages": [warning],
                "next_node": state.get("assigned_agent", "Search"),
                "retries": current_retries + 1
            }
        else:
            fallback_json = '{"type": "text", "message": "I\'m sorry, I couldn\'t process that request right now due to a system error. Please try again!"}'
            last_ai_message = None
            for m in reversed(list(messages)):
                if m.type == "ai":
                    last_ai_message = m
                    break
            if last_ai_message and getattr(last_ai_message, "id", None):
                return {
                    "messages": [AIMessage(content=fallback_json, id=last_ai_message.id)],
                    "next_node": END
                }
            else:
                return {
                    "messages": [AIMessage(content=fallback_json)],
                    "next_node": END
                }
    
    # If the verifier outputted conversational text and a JSON block, extract just the JSON
    import re
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', verification_result, re.DOTALL)
    if json_match:
        verification_result = json_match.group(1).strip()
    else:
        # Fallback: if no code fences, see if we can find the outermost braces
        brace_match = re.search(r'(\{.*\})', verification_result, re.DOTALL)
        if brace_match:
            verification_result = brace_match.group(1).strip()
            
    # Replace the last AI message with the corrected one by matching its ID
        last_ai_message = None
        for m in reversed(list(messages)):
            if m.type == "ai":
                last_ai_message = m
                break
                
        if last_ai_message and getattr(last_ai_message, "id", None):
            return {
                "messages": [AIMessage(content=verification_result, id=last_ai_message.id)],
                "next_node": END
            }
        else:
            updated_messages = []
            replaced = False
            for m in reversed(list(messages)):
                if m.type == "ai" and not replaced:
                    replaced = True
                    continue
                updated_messages.insert(0, m)
            updated_messages.append(AIMessage(content=verification_result))
            return {
                "messages": updated_messages,
                "next_node": END
            }

def route_from_supervisor(state: AgentState) -> str:
    return state.get("assigned_agent", "Search")

def route_from_verification(state: AgentState) -> str:
    return state.get("next_node", END)

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

# workflow.add_node("Verification", verification_node)

workflow.add_edge("Search", END)
workflow.add_edge("Checkout", END)
workflow.add_edge("Tracking", END)

# workflow.add_conditional_edges(
#     "Verification",
#     route_from_verification
# )

# Compile the workflow completely statelessly. 
# Memory persistence is managed entirely by the frontend via local storage.
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
