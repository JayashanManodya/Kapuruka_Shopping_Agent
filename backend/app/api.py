from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from datetime import datetime, timezone

from app.core.agents.agent import shopping_agent, serialize_messages

app = FastAPI(title="Kapruka Shopping Agent API (Stateless)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://kapuruka-shopping-agent.vercel.app"],
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

class ChatRequest(BaseModel):
    messages: list[MessageInput]
    user_email: str | None = None  # Supplied by authenticated frontend

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

# ─────────────────────────────────────────
# Stateless Chat Endpoint
# ─────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Reconstruct messages for LangChain
        messages_to_send = []
        if request.user_email:
            messages_to_send.append({"role": "system", "content": f"The current user's email is {request.user_email}."})
            
        for msg in request.messages:
            msg_dict = {"role": msg.role, "content": msg.content}
            if msg.tool_calls:
                msg_dict["tool_calls"] = msg.tool_calls
            if msg.tool_call_id:
                msg_dict["tool_call_id"] = msg.tool_call_id
            if msg.name:
                msg_dict["name"] = msg.name
            messages_to_send.append(msg_dict)
            
        # Invoke the stateless agent
        response = await shopping_agent.ainvoke(
            {"messages": messages_to_send},
            config={"configurable": {"thread_id": "stateless"}},
        )

        history_json_str = serialize_messages(response.get("messages", []))
        history_list = json.loads(history_json_str)
        
        # Only return the newly generated messages to append, or the whole history.
        # Since frontend expects 'history', we just send back the history.
        return {"history": history_list}

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
