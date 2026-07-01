from sqlmodel import Field, SQLModel, create_engine, Session, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import Optional
import os

DATABASE_URL = "sqlite+aiosqlite:///./kapruka_agent.db"
SYNC_DATABASE_URL = "sqlite:///./kapruka_agent.db"

# Async engine for async endpoints
async_engine = create_async_engine(DATABASE_URL, echo=False)

# Sync engine for initial table creation
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ────────────────────────────────
# SQLModel Models (DB Tables)
# ────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    image: Optional[str] = None
    google_id: Optional[str] = Field(default=None, unique=True)

class UserOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: str = Field(index=True, foreign_key="user.email")
    order_number: str
    product_name: Optional[str] = None
    created_at: Optional[str] = None  # ISO datetime string

class ChatThread(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: str = Field(unique=True, index=True)
    user_email: str = Field(index=True, foreign_key="user.email")
    title: str = Field(default="New Chat")
    updated_at: str  # ISO datetime string

class CartItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: str = Field(index=True, foreign_key="user.email")
    product_id: str
    product_name: str
    price: Optional[float] = None
    image: Optional[str] = None
    quantity: int = Field(default=1)

def create_db_and_tables():
    """Create all DB tables using sync engine (called at app startup)."""
    SQLModel.metadata.create_all(sync_engine)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
