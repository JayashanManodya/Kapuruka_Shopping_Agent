from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
from datetime import datetime, timezone

from app.core.agents.agent import workflow, DB_PATH, serialize_messages, get_checkpointer
from app.core.db.database import create_db_and_tables, get_session, User, UserOrder, ChatThread, CartItem

app = FastAPI(title="Kapruka Shopping Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://kapuruka-shopping-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_email: str | None = None  # Supplied by authenticated frontend

class AuthSyncRequest(BaseModel):
    email: str
    name: str
    image: str | None = None
    google_id: str | None = None

class SaveOrderRequest(BaseModel):
    user_email: str
    order_number: str
    product_name: str | None = None

class AddCartItemRequest(BaseModel):
    product_id: str
    product_name: str
    price: float | None = None
    image: str | None = None


# ─────────────────────────────────────────
# Chat endpoint (persistent SQLite memory)
# ─────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest, session: AsyncSession = Depends(get_session)):
    config = {"configurable": {"thread_id": request.thread_id}}
    try:
        async with get_checkpointer() as checkpointer:
            agent = workflow.compile(checkpointer=checkpointer)
            
            # Inject user_email into the messages so the agent knows who is logged in and can use it for tools
            messages_to_send = []
            if request.user_email:
                messages_to_send.append({"role": "system", "content": f"The current user's email is {request.user_email}."})
            messages_to_send.append({"role": "user", "content": request.message})
            
            response = await agent.ainvoke(
                {"messages": messages_to_send},
                config=config,
            )

        latest_reply = ""
        if "messages" in response and response["messages"]:
            latest_reply = response["messages"][-1].content

        history_json_str = serialize_messages(response.get("messages", []))
        history_list = json.loads(history_json_str)

        # Update ChatThread metadata if user is logged in
        if request.user_email:
            result = await session.execute(
                select(ChatThread).where(ChatThread.thread_id == request.thread_id)
            )
            chat_thread = result.scalar_one_or_none()
            now_iso = datetime.now(timezone.utc).isoformat()
            
            if not chat_thread:
                # Use the first few words of the user message as title
                title = " ".join(request.message.split()[:5])
                if len(request.message.split()) > 5:
                    title += "..."
                chat_thread = ChatThread(
                    thread_id=request.thread_id,
                    user_email=request.user_email,
                    title=title,
                    updated_at=now_iso
                )
                session.add(chat_thread)
            else:
                chat_thread.updated_at = now_iso
            await session.commit()

        return {"response": latest_reply, "history": history_list}

    except Exception as e:
        import traceback
        with open("C:/Users/ASUS/.gemini/antigravity-ide/brain/91f9b98e-13d6-4575-9fe1-2c64a65bf8f0/scratch/error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# Get all chat threads for a user
# ─────────────────────────────────────────
@app.get("/api/chats/{user_email}")
async def get_chats(user_email: str, session: AsyncSession = Depends(get_session)):
    # Get all threads ordered by updated_at descending
    result = await session.execute(
        select(ChatThread)
        .where(ChatThread.user_email == user_email)
        .order_by(ChatThread.updated_at.desc())
    )
    threads = result.scalars().all()
    return {"chats": [t.model_dump() for t in threads]}


# ─────────────────────────────────────────
# Get history for a specific thread
# ─────────────────────────────────────────
@app.get("/api/chat/{thread_id}")
async def get_chat_history(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    try:
        async with get_checkpointer() as checkpointer:
            # We don't invoke the agent here, we just read from the checkpointer
            state = await checkpointer.aget(config)
            
            if not state or "channel_values" not in state or "messages" not in state["channel_values"]:
                return {"history": []}
                
            messages = state["channel_values"]["messages"]
            history_json_str = serialize_messages(messages)
            history_list = json.loads(history_json_str)
            return {"history": history_list}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────
# Auth Sync: create or fetch user on login
# ─────────────────────────────────────────
@app.post("/api/auth/sync")
async def auth_sync(request: AuthSyncRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == request.email))
    existing = result.scalar_one_or_none()

    if existing:
        # Update name/image if changed
        if request.name and existing.name != request.name:
            existing.name = request.name
        if request.image:
            existing.image = request.image
        await session.commit()
        await session.refresh(existing)
        return {"status": "existing", "user": existing.model_dump()}
    else:
        user = User(
            email=request.email,
            name=request.name,
            image=request.image,
            google_id=request.google_id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return {"status": "created", "user": user.model_dump()}


# ─────────────────────────────────────────
# Save order for a user
# ─────────────────────────────────────────
@app.post("/api/orders/save")
async def save_order(request: SaveOrderRequest, session: AsyncSession = Depends(get_session)):
    order = UserOrder(
        user_email=request.user_email,
        order_number=request.order_number,
        product_name=request.product_name,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return {"status": "saved", "order": order.model_dump()}


# ─────────────────────────────────────────
# Get all orders for a user
# ─────────────────────────────────────────
@app.get("/api/orders/{user_email}")
async def get_orders(user_email: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(UserOrder).where(UserOrder.user_email == user_email)
    )
    orders = result.scalars().all()
    return {"orders": [o.model_dump() for o in orders]}

# ─────────────────────────────────────────
# Cart Endpoints
# ─────────────────────────────────────────
@app.get("/api/cart/{user_email}")
async def get_cart(user_email: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CartItem).where(CartItem.user_email == user_email)
    )
    items = result.scalars().all()
    return {"cart": [i.model_dump() for i in items]}

@app.post("/api/cart/{user_email}/add")
async def add_to_cart(user_email: str, request: AddCartItemRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CartItem).where(
            CartItem.user_email == user_email,
            CartItem.product_id == request.product_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.quantity += 1
    else:
        new_item = CartItem(
            user_email=user_email,
            product_id=request.product_id,
            product_name=request.product_name,
            price=request.price,
            image=request.image,
            quantity=1
        )
        session.add(new_item)
    await session.commit()
    return {"status": "added"}

class RemoveCartItemRequest(BaseModel):
    product_id: str

@app.post("/api/cart/{user_email}/remove")
async def remove_from_cart(user_email: str, request: RemoveCartItemRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CartItem).where(
            CartItem.user_email == user_email,
            CartItem.product_id == request.product_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await session.delete(existing)
        await session.commit()
    return {"status": "removed"}

class UpdateCartQuantityRequest(BaseModel):
    product_id: str
    quantity: int

@app.post("/api/cart/{user_email}/update")
async def update_cart_quantity(user_email: str, request: UpdateCartQuantityRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CartItem).where(
            CartItem.user_email == user_email,
            CartItem.product_id == request.product_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if request.quantity <= 0:
            await session.delete(existing)
        else:
            existing.quantity = request.quantity
        await session.commit()
    return {"status": "updated"}

@app.post("/api/cart/{user_email}/clear")
async def clear_cart(user_email: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CartItem).where(CartItem.user_email == user_email)
    )
    items = result.scalars().all()
    for item in items:
        await session.delete(item)
    await session.commit()
    return {"status": "cleared"}

# ─────────────────────────────────────────
# Direct API Checkout (Bypassing LLM)
# ─────────────────────────────────────────
class CheckoutDeliveryInfo(BaseModel):
    address: str
    city: str
    date: str

class CheckoutRequest(BaseModel):
    name: str
    phone: str
    gift_message: str | None = None
    delivery: CheckoutDeliveryInfo
    cart: list[AddCartItemRequest]
    thread_id: str

class SystemMessageRequest(BaseModel):
    content: str

@app.post("/api/chat/{thread_id}/system_message")
async def inject_system_message(thread_id: str, request: SystemMessageRequest):
    """Directly inject an Assistant message into the chat history without invoking the LLM."""
    try:
        from app.core.agents.agent import workflow
        from langchain_core.messages import AIMessage
        
        config = {"configurable": {"thread_id": thread_id}}
        async with get_checkpointer() as checkpointer:
            agent = workflow.compile(checkpointer=checkpointer)
            await agent.aupdate_state(config, {"messages": [{"role": "assistant", "content": request.content}]})
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist message: {str(e)}")

@app.post("/api/checkout")
async def process_checkout(request: CheckoutRequest):
    from app.core.agents.tools import client
    
    # 1. Verify city delivery
    try:
        delivery_res = await client.call("kapruka_check_delivery", {
            "city": request.delivery.city,
            "response_format": "json"
        })
        
        # Parse MCP CallToolResult safely
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
    cart_payload = [{"product_id": c.product_id, "quantity": 1} for c in request.cart]

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
        
        # Parse MCP CallToolResult safely
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
        
        # Persist to chat history
        from app.core.agents.agent import workflow
        
        msg_content = f"Your order has been created successfully! 🎉\n\nOrder Ref: {order_ref}\nCheckout URL: {checkout_url}"
        config = {"configurable": {"thread_id": request.thread_id}}
        
        try:
            async with get_checkpointer() as checkpointer:
                agent = workflow.compile(checkpointer=checkpointer)
                await agent.aupdate_state(config, {"messages": [{"role": "assistant", "content": msg_content}]})
        except Exception as e:
            print(f"Failed to persist checkout message: {e}")
            
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
