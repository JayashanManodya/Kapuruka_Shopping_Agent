from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
from datetime import datetime, timezone

from app.core.agents.agent import workflow, DB_PATH, serialize_messages
from app.core.db.database import create_db_and_tables, get_session, User, UserOrder
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

app = FastAPI(title="Kapruka Shopping Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


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


# ─────────────────────────────────────────
# Chat endpoint (persistent SQLite memory)
# ─────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    try:
        async with AsyncSqliteSaver.from_conn_string(DB_PATH) as checkpointer:
            agent = workflow.compile(checkpointer=checkpointer)
            response = await agent.ainvoke(
                {"messages": [{"role": "user", "content": request.message}]},
                config=config,
            )

        latest_reply = ""
        if "messages" in response and response["messages"]:
            latest_reply = response["messages"][-1].content

        history_json_str = serialize_messages(response.get("messages", []))
        history_list = json.loads(history_json_str)

        return {"response": latest_reply, "history": history_list}

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="127.0.0.1", port=8000, reload=True)
