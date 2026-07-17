"""
Structured Response Format Registry
====================================
All LLM agent responses MUST conform to one of these Pydantic models.
The `type` discriminator field tells the frontend which UI component to render.
"""
from __future__ import annotations

from enum import Enum
import json
from typing import Annotated, Any, Literal, Optional, Union
from pydantic import BaseModel, Field, TypeAdapter, ConfigDict


# ---------------------------------------------------------------------------
# Enums for constrained values
# ---------------------------------------------------------------------------

class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    UNKNOWN = "unknown"


class CartAction(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    UPDATED = "updated"
    CLEARED = "cleared"


class PaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    FAILED = "failed"
    UNPAID = "unpaid"


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class RecommendedItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="", description="Exact product ID")
    name: str = Field(default="", description="Product name")
    summary: str = Field(default="", description="1-2 sentence description")
    image_url: str = Field(default="", description="Image URL")
    category: str = Field(default="", description="Category name")
    price: Union[float, int, dict[str, Any], str] = Field(default=0.0, description="Price in LKR")
    stock: Union[StockStatus, str] = Field(default=StockStatus.UNKNOWN, description="Stock status")
    url: str = Field(default="", description="Product URL")


class CategoryChild(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(default="", description="Child category name")
    url: str = Field(default="", description="Category URL")


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(default="", description="Category name")
    url: str = Field(default="", description="Category URL")
    children: list[CategoryChild] = Field(default_factory=list, description="Subcategories")


class ProductVariant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="", description="Variant ID")
    name: str = Field(default="", description="Variant name")
    sku: Optional[str] = Field(default=None, description="SKU")
    price: Union[float, int, dict[str, Any], str] = Field(default=0.0, description="Variant price")
    stock: Optional[str] = Field(default=None, description="Variant stock status")
    in_stock: Optional[bool] = Field(default=None, description="In stock boolean")
    stock_level: Optional[str] = Field(default=None, description="Stock level")
    attributes: Optional[dict[str, Any]] = Field(default=None, description="Variant attributes")


class ProductDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="", description="Product ID")
    name: str = Field(default="", description="Product name")
    description: str = Field(default="", description="Product description")
    price: Union[float, int, dict[str, Any], str] = Field(default=0.0, description="Price in LKR")
    images: list[str] = Field(default_factory=list, description="List of image URLs")
    variants: list[ProductVariant] = Field(default_factory=list, description="List of variants")
    attributes: dict[str, Any] = Field(default_factory=dict, description="Key-value product attributes")
    stock: Union[StockStatus, str] = Field(default=StockStatus.UNKNOWN, description="Stock status")
    shipping: Union[str, dict[str, Any]] = Field(default="", description="Shipping information")
    url: str = Field(default="", description="Product URL")


class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: Optional[str] = Field(default="", description="Product ID")
    id: Optional[str] = Field(default="", description="Item ID")
    name: Optional[str] = Field(default="", description="Item name")
    product_name: Optional[str] = Field(default="", description="Product name")
    quantity: int = Field(default=1, description="Quantity")
    price: Union[float, int, dict[str, Any], str] = Field(default=0.0, description="Price in LKR")


class OrderTotals(BaseModel):
    model_config = ConfigDict(extra="ignore")
    items: Union[float, int] = Field(default=0.0, description="Items total in LKR")
    delivery: Union[float, int] = Field(default=0.0, description="Delivery fee in LKR")
    grand_total: Union[float, int] = Field(default=0.0, description="Grand total in LKR")


class TrackingTimelineEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str = Field(default="", description="Timeline step label")
    time: Optional[str] = Field(default=None, description="Datetime string or null")
    done: bool = Field(default=False, description="Whether step is completed")


class RecipientInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(default="", description="Recipient name")
    phone: str = Field(default="", description="Recipient phone number")


class DeliveryInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    address: str = Field(default="", description="Delivery address")
    city: str = Field(default="", description="Delivery city")
    date: str = Field(default="", description="Delivery date (YYYY-MM-DD)")


class PaymentInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: Union[PaymentStatus, str] = Field(default="", description="Payment status")
    method: str = Field(default="", description="Payment method")


# ---------------------------------------------------------------------------
# Top-level Response Models
# ---------------------------------------------------------------------------

class RecommendedItemsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["recommended_items"] = "recommended_items"
    message: str = Field(description="Persuasive intro for recommended items")
    items: list[RecommendedItem] = Field(default_factory=list, description="List of recommended items")


class ProductDetailResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["product_detail"] = "product_detail"
    message: str = Field(description="Intro message for product detail")
    product: ProductDetail = Field(description="Detailed product information")


class ListCategoriesResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["list_categories"] = "list_categories"
    message: str = Field(description="Friendly intro encouraging exploration")
    categories: list[Category] = Field(default_factory=list, description="List of categories")


class CartUpdateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["cart_update"] = "cart_update"
    message: str = Field(description="Cart action confirmation message")
    action: Union[CartAction, str] = Field(default=CartAction.ADDED, description="Cart action: added | removed | updated | cleared")
    product_id: Optional[str] = Field(default=None, description="Product ID or null if cleared")
    product_name: Optional[str] = Field(default=None, description="Product name or null if cleared")


class TextResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["text"] = "text"
    message: str = Field(description="Conversational reply or message")


class ReadCartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["read_cart"] = "read_cart"
    message: str = Field(description="Summary message of current cart items")
    items: list[OrderItem] = Field(default_factory=list, description="List of cart items")
    total: Union[float, int] = Field(default=0.0, description="Grand total of cart items in LKR")


class CheckoutFormResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["checkout_form"] = "checkout_form"
    message: str = Field(description="Message asking user to fill delivery details")
    recipient_name: str = Field(default="", description="Recipient name if known")
    phone: str = Field(default="", description="Recipient phone if known")
    address: str = Field(default="", description="Delivery address if known")
    city: str = Field(default="", description="Delivery city if known")
    date: str = Field(default="", description="Delivery date if known")
    sender_name: str = Field(default="", description="Sender name if known")
    gift_message: str = Field(default="", description="Gift message if known")


class OrderSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["order_summary"] = "order_summary"
    message: str = Field(description="Message asking user for order confirmation")
    recipient: Union[RecipientInfo, dict[str, Any]] = Field(default_factory=dict, description="Recipient details")
    delivery: Union[DeliveryInfo, dict[str, Any]] = Field(default_factory=dict, description="Delivery details")
    sender: Union[str, dict[str, Any]] = Field(default="", description="Sender name")
    items: list[Union[OrderItem, dict[str, Any]]] = Field(default_factory=list, description="List of order items")
    delivery_fee: Union[float, int] = Field(default=0.0, description="Delivery fee in LKR")
    grand_total: Union[float, int] = Field(default=0.0, description="Grand total in LKR")


class OrderCreatedResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["order_created"] = "order_created"
    message: str = Field(description="Order confirmation message")
    checkout_url: str = Field(default="", description="Payment checkout URL")
    order_ref: str = Field(default="", description="Order reference number")
    expires_at: str = Field(default="", description="Expiration time string")
    totals: Union[OrderTotals, dict[str, Any]] = Field(default_factory=dict, description="Order price totals")


class TrackOrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["track_order"] = "track_order"
    message: str = Field(description="Status message for order tracking")
    order_ref: str = Field(default="", description="Order reference number")
    status: str = Field(default="", description="Current order status")
    timeline: list[Union[TrackingTimelineEntry, dict[str, Any]]] = Field(default_factory=list, description="Tracking timeline steps")
    recipient: Union[RecipientInfo, dict[str, Any]] = Field(default_factory=dict, description="Recipient details")
    delivery: Union[DeliveryInfo, dict[str, Any]] = Field(default_factory=dict, description="Delivery details")
    payment: Union[PaymentInfo, dict[str, Any]] = Field(default_factory=dict, description="Payment details")
    items: list[Union[OrderItem, dict[str, Any]]] = Field(default_factory=list, description="List of items in order")


# ---------------------------------------------------------------------------
# Discriminated Union — The master response type for API & Frontend
# ---------------------------------------------------------------------------

AgentResponse = Annotated[
    Union[
        RecommendedItemsResponse,
        ProductDetailResponse,
        ListCategoriesResponse,
        CartUpdateResponse,
        TextResponse,
        ReadCartResponse,
        CheckoutFormResponse,
        OrderSummaryResponse,
        OrderCreatedResponse,
        TrackOrderResponse,
    ],
    Field(discriminator="type"),
]

# Per-agent response models for structured output generation
SearchAgentResponseModel = Annotated[
    Union[
        RecommendedItemsResponse,
        ProductDetailResponse,
        ListCategoriesResponse,
        CartUpdateResponse,
        ReadCartResponse,
        TextResponse,
    ],
    Field(discriminator="type"),
]

CheckoutAgentResponseModel = Annotated[
    Union[
        CheckoutFormResponse,
        OrderSummaryResponse,
        OrderCreatedResponse,
        ReadCartResponse,
        TextResponse,
    ],
    Field(discriminator="type"),
]

TrackingAgentResponseModel = Annotated[
    Union[
        TrackOrderResponse,
        TextResponse,
    ],
    Field(discriminator="type"),
]

_agent_response_adapter = TypeAdapter(AgentResponse)


def parse_agent_response(raw: Union[str, dict, Any]) -> AgentResponse:
    """
    Parse a raw string, dict, or object into a validated AgentResponse subtype.
    Falls back to TextResponse if parsing fails or the response is malformed.
    """
    if isinstance(raw, BaseModel):
        try:
            return _agent_response_adapter.validate_python(raw.model_dump())
        except Exception:
            return TextResponse(type="text", message=getattr(raw, "message", str(raw)))

    if isinstance(raw, dict):
        try:
            return _agent_response_adapter.validate_python(raw)
        except Exception:
            msg = str(raw.get("message", json.dumps(raw))) if "message" in raw else json.dumps(raw)
            return TextResponse(type="text", message=msg)

    raw_str = str(raw).strip()
    if raw_str.startswith("```json"):
        raw_str = raw_str[7:]
    elif raw_str.startswith("```"):
        raw_str = raw_str[3:]
    if raw_str.endswith("```"):
        raw_str = raw_str[:-3]
    raw_str = raw_str.strip()

    try:
        data = json.loads(raw_str)
        if isinstance(data, dict):
            # First try direct validation
            try:
                return _agent_response_adapter.validate_python(data)
            except Exception:
                # If data has an embedded 'type' and 'message', check if 'message' is a JSON string of a response model
                inner_msg = data.get("message", "")
                if isinstance(inner_msg, str) and inner_msg.strip().startswith("{") and inner_msg.strip().endswith("}"):
                    try:
                        inner_data = json.loads(inner_msg.strip())
                        if isinstance(inner_data, dict) and "type" in inner_data:
                            return _agent_response_adapter.validate_python(inner_data)
                    except Exception:
                        pass
                # Otherwise, if data itself has a valid 'type', return fallback TextResponse with the inner message
                if "message" in data:
                    return TextResponse(type="text", message=str(data["message"]))
    except Exception:
        pass

    return TextResponse(type="text", message=raw_str)
