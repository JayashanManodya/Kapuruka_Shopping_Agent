from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from langchain_core.tools import tool
from app.core.config.settings import settings
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import datetime


class KaprukaMCPClient:
    async def call(self, tool_name: str, params: dict):
        params = {key: value for key, value in params.items() if value is not None}

        async with streamablehttp_client(settings.server_url) as (
            read_stream,
            write_stream,
            _,
        ):
            async with ClientSession(
                read_stream,
                write_stream,
            ) as session:
                await session.initialize()
                return await session.call_tool(
                    tool_name,
                    arguments={
                        "params": params
                    },
                )

client = KaprukaMCPClient()


@tool
async def get_categories() -> dict:
    """Return the Kapruka category tree for browsing and filtering products.

    Returns a JSON-compatible dictionary from `kapruka_list_categories`.
    """
    result = await client.call(
        "kapruka_list_categories",
        {
            "depth": 2,
            "response_format": "json"
        }
    )

    return result

@tool
async def search_products(product: str, limit: int = 10, category: str | None = None, min_price: int | None = None, max_price: int | None = None, sort: str | None = None) -> dict:

    """Search purchasable Kapruka products by query and optional filters.

    Args:
        product: Search text forwarded as the Kapruka `q` parameter.
        limit: Maximum number of results to return.
        category: Optional category filter.
        min_price: Optional minimum price filter.
        max_price: Optional maximum price filter.
        sort: Optional sort key requested by Kapruka.

    Returns:
        JSON-compatible search results from `kapruka_search_products`.
    """
    result = await client.call(
        "kapruka_search_products",
        {
            "q": product,
            "limit": limit,
            "category": category,
            "min_price": min_price,
            "max_price": max_price,
            "sort": sort,
            "response_format": "json"
        }
    )

    return result

@tool
async def get_product(product_id: str) -> dict:
    """Fetch the full Kapruka product record for a single product ID.

    Args:
        product_id: Kapruka product identifier.

    Returns:
        JSON-compatible product details from `kapruka_get_product`.
    """
    result = await client.call(
        "kapruka_get_product",
        {
            "product_id": product_id,
            "response_format": "json"
        }
    )

    return result

@tool
async def list_delivery_cities(query: str = None, limit: int = None) -> dict:
    """Returns a list of valid delivery cities from Kapruka.

    Args:
        query: Optional search query for the city.
        limit: Optional maximum number of cities to return.

    Returns:
        JSON-compatible city list from `kapruka_list_delivery_cities`.
    """
    result = await client.call(
        "kapruka_list_delivery_cities",
        {
            "query": query,
            "limit": limit,
            "response_format": "json"
        }
    )
    return result

@tool
async def check_delivery(city: str, delivery_date: str = None, product_id: str = None) -> dict:
    """Verify whether delivery is available for a given city and optionally a specific product and date.

    Args:
        city: The name of the city to check delivery for.
        delivery_date: Optional delivery date. MUST be in YYYY-MM-DD format and be a future date.
        product_id: Optional product ID to check availability for.

    Returns:
        JSON-compatible delivery availability details from `kapruka_check_delivery`.
    """
    if delivery_date:
        import datetime
        try:
            parsed = datetime.datetime.strptime(delivery_date, "%Y-%m-%d").date()
        except ValueError:
            return {"error": f"delivery_date MUST be strictly in YYYY-MM-DD format. You provided: {delivery_date}. Please reformat it."}
        today = datetime.datetime.now().date()
        if parsed <= today:
            return {"error": f"delivery_date MUST be a future date. Today is {today.strftime('%Y-%m-%d')}."}

    result = await client.call(
        "kapruka_check_delivery",
        {
            "city": city,
            "delivery_date": delivery_date,
            "product_id": product_id,
            "response_format": "json"
        }
    )
    return result

class CartItem(BaseModel):
    product_id: str = Field(..., description="The ID of the product")
    quantity: int = Field(default=1, description="Quantity of the product")

class RecipientInfo(BaseModel):
    name: str = Field(..., description="Name of the recipient")
    phone: str = Field(..., description="Contact number for delivery")

class DeliveryInfo(BaseModel):
    address: str = Field(..., description="Delivery address")
    city: str = Field(..., description="City for delivery (must be validated)")
    date: str = Field(..., description="Delivery date in YYYY-MM-DD format (must be a future date)")

    @field_validator("date")
    def validate_future_date(cls, v):
        try:
            parsed_date = datetime.datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Date must be in YYYY-MM-DD format. Got: {v}")
        
        today = datetime.datetime.now().date()
        if parsed_date <= today:
            raise ValueError(f"Delivery date must be a future date. Today is {today.strftime('%Y-%m-%d')}.")
        return v

class SenderInfo(BaseModel):
    name: str = Field(default="Guest", description="Name of the sender")
    anonymous: bool = Field(default=False, description="Whether the sender is anonymous")

@tool
async def create_order(
    cart: List[CartItem], 
    recipient: RecipientInfo, 
    delivery: DeliveryInfo, 
    sender: SenderInfo, 
    gift_message: Optional[str] = None, 
    currency: Optional[str] = None
) -> dict:
    """Create a guest checkout order.

    Args:
        cart: A list of items to order.
        recipient: Recipient details (name and phone).
        delivery: Delivery details (address, city, and YYYY-MM-DD date).
        sender: Sender details.
        gift_message: Optional gift message.
        currency: Optional currency code.

    Returns:
        JSON-compatible checkout URL and order ref from `kapruka_create_order`.
    """
    result = await client.call(
        "kapruka_create_order",
        {
            "cart": [item.dict() for item in cart],
            "recipient": recipient.dict(),
            "delivery": delivery.dict(),
            "sender": sender.dict(),
            "gift_message": gift_message,
            "currency": currency,
            "response_format": "json"
        }
    )
    return result

@tool
async def track_order(order_number: str) -> dict:
    """Track a paid order by order number.

    Args:
        order_number: The Kapruka order number to track.

    Returns:
        JSON-compatible order status and timeline from `kapruka_track_order`.
    """
    result = await client.call(
        "kapruka_track_order",
        {
            "order_number": order_number,
            "response_format": "json"
        }
    )
    return result

if __name__ == "__main__":
    import asyncio

    async def main():
        # result = await get_categories.ainvoke({})
        # print(result)

        # result = await search_products.ainvoke({"product": "chocolate"})
        # print(result)

        result = await get_product.ainvoke({"product_id": "CHOCOLATES001937"})
        print(result)

    asyncio.run(main())