from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from datetime import datetime, timezone
import contextvars

current_cart = contextvars.ContextVar("current_cart", default=[])

from app.core.agents.agent import shopping_agent, serialize_messages

app = FastAPI(title="Kapruka Shopping Agent API (Stateless)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://kiko-kapuruka.vercel.app", "https://kapuruka-shopping-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────
class MessageInput(BaseModel):
    role: str
    content: str
    tool_calls: list | None = None
    tool_call_id: str | None = None
    name: str | None = None
    image_base64: str | None = None

class ChatRequest(BaseModel):
    messages: list[MessageInput]
    user_email: str | None = None  # Supplied by authenticated frontend
    cart: list | None = None
    language: str | None = "English"

class CheckoutDeliveryInfo(BaseModel):
    address: str
    city: str
    date: str

class CheckoutCartItem(BaseModel):
    product_id: str
    quantity: int | None = 1
    
class CheckoutRequest(BaseModel):
    name: str
    phone: str
    gift_message: str | None = None
    delivery: CheckoutDeliveryInfo
    cart: list[CheckoutCartItem]

def detect_language_from_text(text: str) -> str | None:
    if not text:
        return None
    
    # 1. Sinhala Unicode Check (range 0D80 to 0DFF)
    if any(0x0D80 <= ord(char) <= 0x0DFF for char in text):
        return "Sinhala (Unicode)"
        
    # 2. Tamil Unicode Check (range 0B80 to 0BFF)
    if any(0x0B80 <= ord(char) <= 0x0BFF for char in text):
        return "Tamil (Unicode)"
        
    import re
    # Tokenize the lowercase text into whole words
    words = set(re.findall(r'\b\w+\b', text.lower()))
    
    # 3. Singlish Keywords Check (highly specific Romanized Sinhala words, no English overlap)
    singlish_keywords = {
        "machan", "machang", "malli", "nangi", "aiya", "akka", "kohmada", "kohomada", 
        "hari", "neda", "ne", "puluwanda", "puluwan", "ganna", "epa", "oneda", "onai", 
        "onay", "mokada", "oyata", "mata", "karanna", "sthuthi", "stuti", "ayubowan", 
        "badu", "wada", "salli", "hadanna", "denna", "danna", "balanna", "thiyenawada", 
        "thiyeda", "thiyenawa", "laga", "nadda", "naha", "nehe", "wisthara", "vistara", 
        "laaba", "ganan", "oyala", "ape", "ekak", "dekak", "thunak", "ewanna", "dapan", 
        "kiyada", "keeyada", "keeyak", "kiyala", "kiyanna", "koheda", "monawada", 
        "mokakda", "kauda", "kawda", "ehema", "mehema", "ehenam", "yawanna", "genna", 
        "aranna", "karala", "kala", "kara", "kalaa"
    }
    if any(word in words for word in singlish_keywords):
        return "Singlish"
        
    # 4. Tanglish Keywords Check (highly specific Romanized Tamil words, no English overlap)
    tanglish_keywords = {
        "epdi", "irukinga", "vanakkam", "vendum", "nandri", "panna", "mudiyum", "unga", 
        "enakku", "enaku", "ungaluku", "romba", "nalla", "veetuku", "kodu", "pannu", 
        "seyya", "kelunga", "kamunga", "panniyachu", "irukku", "illai", "irukkada", 
        "illada", "sari", "ama", "thambi", "anna", "akka", "mama", "kudunga", "kaatunga", 
        "pannunga", "seinga", "panunga", "vendaam"
    }
    if any(word in words for word in tanglish_keywords):
        return "Tanglish"
        
    # 5. English Keywords Check
    english_keywords = {
        "show", "me", "find", "search", "get", "retrieve", "list", 
        "cart", "basket", "checkout", "order", "delivery", "track", 
        "please", "help", "hello", "hi", "what", "where", "how", "can"
    }
    if any(word in words for word in english_keywords):
        return "English"
        
    return None

def get_language_instruction(language: str) -> str:
    if language == "Sinhala (Unicode)":
        return (
            "CRITICAL LANGUAGE RULE:\n"
            "The user is currently conversing strictly in Sinhala Unicode script (e.g., 'කොහොමද'). "
            "You MUST reply strictly in Sinhala Unicode script. "
            "Do NOT reply in Singlish (Romanized Sinhala) or English. "
            "Inside your structured JSON response, the 'message' field must contain the response in Sinhala Unicode script. "
            "All JSON keys and other structural fields must remain strictly in English as defined."
        )
    elif language == "Singlish":
        return (
            "CRITICAL LANGUAGE RULE:\n"
            "The user is currently conversing strictly in Singlish (Romanized Sinhala) (e.g., 'kohmada machan', 'mata cake one'). "
            "You MUST reply strictly in Singlish. "
            "Do NOT reply in Sinhala Unicode script or English. "
            "Inside your structured JSON response, the 'message' field must contain the response in Singlish. "
            "All JSON keys and other structural fields must remain strictly in English as defined."
        )
    elif language == "Tamil (Unicode)":
        return (
            "CRITICAL LANGUAGE RULE:\n"
            "The user is currently conversing strictly in Tamil Unicode script (e.g., 'எப்படி இருக்கிறீர்கள்'). "
            "You MUST reply strictly in Tamil Unicode script. "
            "Do NOT reply in Tanglish (Romanized Tamil) or English. "
            "Inside your structured JSON response, the 'message' field must contain the response in Tamil Unicode script. "
            "All JSON keys and other structural fields must remain strictly in English as defined."
        )
    elif language == "Tanglish":
        return (
            "CRITICAL LANGUAGE RULE:\n"
            "The user is currently conversing strictly in Tanglish (Romanized Tamil) (e.g., 'epdi irukinga', 'enakku cake vendum'). "
            "You MUST reply strictly in Tanglish. "
            "Do NOT reply in Tamil Unicode script or English. "
            "Inside your structured JSON response, the 'message' field must contain the response in Tanglish. "
            "All JSON keys and other structural fields must remain strictly in English as defined."
        )
    else:
        return (
            "LANGUAGE RULE: The user's preferred language is English. Respond strictly in English with a warm, persuasive Sri Lankan shopping-assistant vibe."
        )

# ─────────────────────────────────────────
# Stateless Chat Endpoint
# ─────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize contextvar with the incoming cart
        current_cart.set(request.cart or [])
        
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
        
        # Detect language from the latest user message
        last_user_content = ""
        for msg in reversed(request.messages):
            if msg.role in ("user", "human") and msg.content:
                last_user_content = msg.content
                break
                
        detected_lang = detect_language_from_text(last_user_content) if last_user_content else None
        active_language = detected_lang or request.language or "English"
        
        # Reconstruct messages for LangChain
        messages_to_send = []
        if request.user_email:
            messages_to_send.append(SystemMessage(content=f"The current user's email is {request.user_email}."))
            
        # Add language instructions system message
        messages_to_send.append(SystemMessage(content=get_language_instruction(active_language)))
            
        if request.cart and len(request.cart) > 0:
            cart_text = ", ".join([f"{item.get('product_name', 'Product')} (ID: {item.get('product_id', '')}, Qty: {item.get('quantity', 1)}, Price: LKR {item.get('price', 0)})" for item in request.cart])
            messages_to_send.append(SystemMessage(content=f"The user currently has these items in their frontend cart: {cart_text}. When checking out, YOU MUST process the ENTIRE cart together as one order."))
            
        for msg in request.messages:
            if msg.role == "system":
                messages_to_send.append(SystemMessage(content=msg.content))
            elif msg.role in ("user", "human"):
                if msg.image_base64:
                    content_parts = []
                    if msg.content:
                        content_parts.append({"type": "text", "text": msg.content})
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": msg.image_base64}
                    })
                    messages_to_send.append(HumanMessage(content=content_parts))
                else:
                    messages_to_send.append(HumanMessage(content=msg.content))
            elif msg.role in ("assistant", "ai"):
                kwargs = {"content": msg.content or ""}
                if msg.tool_calls:
                    kwargs["tool_calls"] = msg.tool_calls
                messages_to_send.append(AIMessage(**kwargs))
            elif msg.role == "tool":
                messages_to_send.append(ToolMessage(
                    content=msg.content or "", 
                    tool_call_id=msg.tool_call_id or "", 
                    name=msg.name or ""
                ))
        
        # Sanitize: Remove any orphaned tool messages (tool messages not preceded by an AI message with tool_calls)
        sanitized_messages = []
        for i, m in enumerate(messages_to_send):
            if isinstance(m, ToolMessage):
                # Check if there is an AIMessage with tool_calls before this (ignoring other ToolMessages in between)
                valid = False
                for prev in reversed(sanitized_messages):
                    if isinstance(prev, AIMessage):
                        if getattr(prev, "tool_calls", None):
                            valid = True
                        break
                
                if valid:
                    sanitized_messages.append(m)
                else:
                    print(f"Dropping orphaned tool message: {m.name}")
                    continue
            else:
                sanitized_messages.append(m)
        
        # Additional sanitize: Remove tool_calls from AIMessages if they don't have corresponding ToolMessages
        final_messages = []
        for i, m in enumerate(sanitized_messages):
            if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
                # Count tool calls
                expected_calls = set(tc["id"] for tc in m.tool_calls)
                # Find following ToolMessages
                for next_m in sanitized_messages[i+1:]:
                    if isinstance(next_m, ToolMessage):
                        if next_m.tool_call_id in expected_calls:
                            expected_calls.remove(next_m.tool_call_id)
                    elif isinstance(next_m, AIMessage) or isinstance(next_m, HumanMessage):
                        break # Stop looking when we hit another AI or Human message
                
                if len(expected_calls) > 0:
                    # Missing responses! Strip tool calls to prevent OpenAI 400 errors.
                    m.tool_calls = []
            final_messages.append(m)
            
        messages_to_send = final_messages
        
        # ── INTERCEPT STATIC TEMPLATES ──
        # Check if user explicitly asks for shopping categories
        def get_text_content(msg):
            if isinstance(msg.content, str):
                return msg.content
            elif isinstance(msg.content, list):
                return " ".join([p.get("text", "") for p in msg.content if isinstance(p, dict) and p.get("type") == "text"])
            return ""

        last_human_msg = next((get_text_content(m).lower() for m in reversed(messages_to_send) if isinstance(m, HumanMessage)), "")
        
        # Broad list of triggers
        category_triggers = ["categories", "category", "departments", "what's available", "explore what"]
        
        # Avoid intercepting if they are explicitly asking to search inside a specific category
        is_search = any(word in last_human_msg for word in ["in", "search", "find", "looking for", "products"])
        
        if any(trigger in last_human_msg for trigger in category_triggers) and not is_search:
            history_msgs = [m for m in final_messages if m.type != "system"]
            history_json_str = serialize_messages(history_msgs)
            history_list = json.loads(history_json_str)
            # Add an AI message to history indicating the response
            history_list.append({
                "role": "assistant",
                "content": '{"type": "list_categories", "message": "Here you go, machan! Take your time and browse through whatever catches your eye."}'
            })
            return {
                "history": history_list,
                "cart": current_cart.get(),
                "structured_response": {
                    "type": "list_categories",
                    "message": "Here you go, machan! Take your time and browse through whatever catches your eye. Anything specific you're looking for, just let me know!",
                    "categories": [] # Frontend will render its own hardcoded UI for this
                },
                "language": active_language
            }
        # ────────────────────────────────
            
        # Invoke the stateless agent
        response = await shopping_agent.ainvoke(
            {"messages": messages_to_send, "language": active_language},
            config={"configurable": {"thread_id": "stateless"}},
        )

        # Strip out system messages before returning to frontend
        history_msgs = [m for m in response.get("messages", []) if m.type != "system"]
        history_json_str = serialize_messages(history_msgs)
        history_list = json.loads(history_json_str)
        
        # Extract the structured response parsed by the verification node
        structured_response = response.get("structured_response", None)
        
        # Fallback: if verification node didn't set it, parse the last AI message
        if structured_response is None:
            from app.core.config.response_formats import parse_agent_response
            last_ai = next(
                (m for m in reversed(history_list) if m.get("role") == "assistant" and m.get("content")),
                None
            )
            if last_ai:
                parsed = parse_agent_response(last_ai["content"])
                structured_response = parsed.model_dump()
            else:
                structured_response = {"type": "text", "message": ""}

        # Only refine active language from the agent's actual output if the user's input language was not explicitly detected
        if not detected_lang:
            response_msg = structured_response.get("message", "") if structured_response else ""
            if response_msg:
                refined_lang = detect_language_from_text(response_msg)
                if refined_lang:
                    active_language = refined_lang

        new_cart = current_cart.get()
        return {"history": history_list, "cart": new_cart, "structured_response": structured_response, "language": active_language}

    except Exception as e:
        import traceback
        traceback.print_exc()
        with open("api_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────
# Direct API Checkout (Bypassing LLM)
# ─────────────────────────────────────────
@app.post("/api/checkout")
async def process_checkout(request: CheckoutRequest):
    from app.core.agents.tools import client
    
    # 1. Verify city delivery
    try:
        delivery_res = await client.call("kapruka_check_delivery", {
            "city": request.delivery.city,
            "response_format": "json"
        })
        
        delivery_text = delivery_res.content[0].text if delivery_res.content else ""
        try:
            delivery_data = json.loads(delivery_text)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Delivery check failed: {delivery_text}")
        
        if not delivery_data.get("available"):
            raise HTTPException(status_code=400, detail=f"Delivery is not available for {request.delivery.city}. Error: {delivery_data.get('error', '')}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify delivery: {str(e)}")

    # 2. Format cart items
    cart_payload = [{"product_id": c.product_id, "quantity": getattr(c, "quantity", 1)} for c in request.cart]

    # 3. Create Order
    try:
        order_res = await client.call("kapruka_create_order", {
            "cart": cart_payload,
            "recipient": {
                "name": request.name,
                "phone": request.phone
            },
            "delivery": {
                "address": request.delivery.address,
                "city": request.delivery.city,
                "date": request.delivery.date
            },
            "sender": {
                "name": "Guest",
                "anonymous": True
            },
            "gift_message": request.gift_message,
            "response_format": "json"
        })
        
        order_text = order_res.content[0].text if order_res.content else ""
        try:
            order_data = json.loads(order_text)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Order creation failed: {order_text}")
        
        if "error" in order_data:
            raise HTTPException(status_code=400, detail=f"Order creation error: {order_data['error']}")
            
        if not order_data or "checkout_url" not in order_data:
            raise HTTPException(status_code=500, detail="Order creation failed. Missing checkout_url.")
            
        checkout_url = order_data["checkout_url"]
        order_ref = order_data.get("order_ref", "UNKNOWN")
        
        return {
            "checkout_url": checkout_url,
            "order_ref": order_ref
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="127.0.0.1", port=8000, reload=True)
