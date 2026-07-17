import json
import pytest
from pydantic import TypeAdapter
from app.models.response_models import (
    RecommendedItem,
    RecommendedItemsResponse,
    ProductDetail,
    ProductVariant,
    ProductDetailResponse,
    CategoryChild,
    Category,
    ListCategoriesResponse,
    CartUpdateResponse,
    TextResponse,
    OrderItem,
    ReadCartResponse,
    CheckoutFormResponse,
    RecipientInfo,
    DeliveryInfo,
    OrderSummaryResponse,
    OrderTotals,
    OrderCreatedResponse,
    TrackingTimelineEntry,
    PaymentInfo,
    TrackOrderResponse,
    AgentResponse,
    parse_agent_response,
)

adapter = TypeAdapter(AgentResponse)

def test_recommended_items_serialization():
    data = {
        "type": "recommended_items",
        "message": "Here are your items",
        "items": [
            {
                "id": "prod_1",
                "name": "Red Roses",
                "summary": "Beautiful roses",
                "image_url": "http://example.com/img.jpg",
                "category": "Flowers",
                "price": 1500.0,
                "stock": "in_stock",
                "url": "http://example.com/prod_1"
            }
        ]
    }
    model = adapter.validate_python(data)
    assert isinstance(model, RecommendedItemsResponse)
    assert model.type == "recommended_items"
    assert model.items[0].id == "prod_1"
    assert json.loads(model.model_dump_json()) == data


def test_product_detail_serialization():
    data = {
        "type": "product_detail",
        "message": "Item details",
        "product": {
            "id": "prod_2",
            "name": "Chocolate Cake",
            "description": "Delicious cake",
            "price": 3000.0,
            "images": ["http://example.com/cake.jpg"],
            "variants": [{"id": "v1", "name": "1kg", "price": 3000.0, "stock": "in_stock"}],
            "attributes": {"flavor": "Chocolate"},
            "stock": "in_stock",
            "shipping": "Local delivery",
            "url": "http://example.com/prod_2"
        }
    }
    model = adapter.validate_python(data)
    assert isinstance(model, ProductDetailResponse)
    assert model.type == "product_detail"
    assert model.product.id == "prod_2"
    assert model.model_dump(exclude_none=True) == data


def test_list_categories_serialization():
    data = {
        "type": "list_categories",
        "message": "Categories list",
        "categories": [
            {
                "name": "Flowers",
                "url": "http://example.com/cat1",
                "children": [{"name": "Roses", "url": "http://example.com/sub1"}]
            }
        ]
    }
    model = adapter.validate_python(data)
    assert isinstance(model, ListCategoriesResponse)
    assert model.type == "list_categories"
    assert json.loads(model.model_dump_json()) == data


def test_cart_update_serialization():
    data = {
        "type": "cart_update",
        "message": "Cart updated",
        "action": "added",
        "product_id": "prod_1",
        "product_name": "Red Roses"
    }
    model = adapter.validate_python(data)
    assert isinstance(model, CartUpdateResponse)
    assert model.type == "cart_update"
    assert json.loads(model.model_dump_json()) == data


def test_text_serialization():
    data = {
        "type": "text",
        "message": "Hello world"
    }
    model = adapter.validate_python(data)
    assert isinstance(model, TextResponse)
    assert model.type == "text"
    assert json.loads(model.model_dump_json()) == data


def test_read_cart_serialization():
    data = {
        "type": "read_cart",
        "message": "Cart items",
        "items": [
            {
                "product_id": "prod_1",
                "id": "",
                "name": "",
                "product_name": "Red Roses",
                "quantity": 2,
                "price": 1500.0
            }
        ],
        "total": 3000.0
    }
    model = adapter.validate_python(data)
    assert isinstance(model, ReadCartResponse)
    assert model.type == "read_cart"
    assert model.total == 3000.0


def test_checkout_form_serialization():
    data = {
        "type": "checkout_form",
        "message": "Please enter details",
        "recipient_name": "Kasun",
        "phone": "0771234567",
        "address": "123 Main St",
        "city": "Colombo",
        "date": "2026-07-20",
        "sender_name": "Nimal",
        "gift_message": "Happy Birthday!"
    }
    model = adapter.validate_python(data)
    assert isinstance(model, CheckoutFormResponse)
    assert model.type == "checkout_form"
    assert json.loads(model.model_dump_json()) == data


def test_order_summary_serialization():
    data = {
        "type": "order_summary",
        "message": "Confirm your order",
        "recipient": {"name": "Kasun", "phone": "0771234567"},
        "delivery": {"address": "123 Main St", "city": "Colombo", "date": "2026-07-20"},
        "sender": "Nimal",
        "items": [{"product_id": "", "id": "", "name": "", "product_name": "Red Roses", "quantity": 1, "price": 1500.0}],
        "delivery_fee": 500.0,
        "grand_total": 2000.0
    }
    model = adapter.validate_python(data)
    assert isinstance(model, OrderSummaryResponse)
    assert model.type == "order_summary"
    assert model.grand_total == 2000.0


def test_order_created_serialization():
    data = {
        "type": "order_created",
        "message": "Order created",
        "checkout_url": "http://example.com/checkout",
        "order_ref": "KAP-1001",
        "expires_at": "2026-07-20T10:00:00Z",
        "totals": {"items": 1500.0, "delivery": 500.0, "grand_total": 2000.0}
    }
    model = adapter.validate_python(data)
    assert isinstance(model, OrderCreatedResponse)
    assert model.type == "order_created"
    assert model.order_ref == "KAP-1001"


def test_track_order_serialization():
    data = {
        "type": "track_order",
        "message": "Order status",
        "order_ref": "KAP-1001",
        "status": "Processing",
        "timeline": [{"label": "Order Placed", "time": "2026-07-17", "done": True}],
        "recipient": {"name": "Kasun", "phone": "0771234567"},
        "delivery": {"address": "123 Main St", "city": "Colombo", "date": "2026-07-20"},
        "payment": {"status": "paid", "method": "Credit Card"},
        "items": [{"product_id": "", "id": "", "name": "", "product_name": "Red Roses", "quantity": 1, "price": 1500.0}]
    }
    model = adapter.validate_python(data)
    assert isinstance(model, TrackOrderResponse)
    assert model.type == "track_order"
    assert model.status == "Processing"


def test_parse_agent_response_fallback():
    # Valid json string
    res1 = parse_agent_response('{"type": "text", "message": "hello"}')
    assert isinstance(res1, TextResponse)
    assert res1.message == "hello"

    # Malformed string fallback
    res2 = parse_agent_response('Plain text response')
    assert isinstance(res2, TextResponse)
    assert res2.message == "Plain text response"
