"""
Structured Response Format Registry
====================================
All LLM agent responses MUST conform to one of these Pydantic models.
The `type` discriminator field tells the frontend which UI component to render.
"""
from __future__ import annotations

from typing import Annotated, Any, Literal, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class RecommendedItem(BaseModel):
    id: str
    name: str
    summary: str = ""
    image_url: str = ""
    category: str = ""
    price: float = 0
    stock: str = "unknown"   # "in_stock" | "low_stock" | "out_of_stock"
    url: str = ""


class CategoryChild(BaseModel):
    name: str
    url: str = ""


class Category(BaseModel):
    name: str
    url: str = ""
    children: list[CategoryChild] = []


class ProductVariant(BaseModel):
    id: str = ""
    name: str = ""
    price: float = 0
    stock: str = ""


class ProductDetail(BaseModel):
    id: str
    name: str
    description: str = ""
    price: float = 0
    images: list[str] = []
    variants: list[ProductVariant] = []
    attributes: dict[str, Any] = {}
    stock: str = "unknown"
    shipping: Union[str, dict[str, Any]] = ""
    url: str = ""


class OrderItem(BaseModel):
    name: str
    quantity: int = 1
    price: float = 0


class OrderTotals(BaseModel):
    items: float = 0
    delivery: float = 0
    grand_total: float = 0


class TrackingTimelineEntry(BaseModel):
    label: str
    time: Optional[str] = None
    done: bool = False


class RecipientInfo(BaseModel):
    name: str = ""
    phone: str = ""


class DeliveryInfo(BaseModel):
    address: str = ""
    city: str = ""
    date: str = ""


class PaymentInfo(BaseModel):
    status: str = ""
    method: str = ""


# ---------------------------------------------------------------------------
# Response type models
# ---------------------------------------------------------------------------

class RecommendedItemsResponse(BaseModel):
    type: Literal["recommended_items"]
    message: str
    items: list[RecommendedItem] = []


class ProductDetailResponse(BaseModel):
    type: Literal["product_detail"]
    message: str
    product: ProductDetail


class ListCategoriesResponse(BaseModel):
    type: Literal["list_categories"]
    message: str
    categories: list[Category] = []


class CartUpdateResponse(BaseModel):
    type: Literal["cart_update"]
    message: str
    action: str = ""           # "added" | "removed" | "updated" | "cleared"
    product_id: Optional[str] = None
    product_name: Optional[str] = None


class ReadCartResponse(BaseModel):
    type: Literal["read_cart"]
    message: str
    items: list[OrderItem] = []
    total: float = 0


class OrderSummaryResponse(BaseModel):
    type: Literal["order_summary"]
    message: str
    recipient: RecipientInfo = Field(default_factory=RecipientInfo)
    delivery: DeliveryInfo = Field(default_factory=DeliveryInfo)
    sender: str = ""
    items: list[OrderItem] = []
    delivery_fee: float = 0
    grand_total: float = 0


class OrderCreatedResponse(BaseModel):
    type: Literal["order_created"]
    message: str
    checkout_url: str = ""
    order_ref: str = ""
    expires_at: str = ""
    totals: OrderTotals = Field(default_factory=OrderTotals)


class TrackOrderResponse(BaseModel):
    type: Literal["track_order"]
    message: str
    order_ref: str = ""
    status: str = ""
    timeline: list[TrackingTimelineEntry] = []
    recipient: RecipientInfo = Field(default_factory=RecipientInfo)
    delivery: DeliveryInfo = Field(default_factory=DeliveryInfo)
    payment: PaymentInfo = Field(default_factory=PaymentInfo)
    items: list[OrderItem] = []


class TextResponse(BaseModel):
    type: Literal["text"]
    message: str


# ---------------------------------------------------------------------------
# Discriminated union — the single type the API/frontend speaks
# ---------------------------------------------------------------------------

AgentResponse = Annotated[
    Union[
        RecommendedItemsResponse,
        ProductDetailResponse,
        ListCategoriesResponse,
        CartUpdateResponse,
        OrderSummaryResponse,
        OrderCreatedResponse,
        TrackOrderResponse,
        ReadCartResponse,
        TextResponse,
    ],
    Field(discriminator="type"),
]


def parse_agent_response(raw: str) -> AgentResponse:
    """
    Parse a raw JSON string from the LLM into the correct AgentResponse subtype.
    Falls back to TextResponse if the JSON is malformed or the type is unknown.
    """
    import json
    from pydantic import TypeAdapter

    adapter = TypeAdapter(AgentResponse)
    
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        return adapter.validate_python(data)
    except Exception:
        # Fallback: wrap as plain text so the frontend always gets a valid object
        return TextResponse(type="text", message=raw)
