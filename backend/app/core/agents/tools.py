from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from langchain_core.tools import tool
from app.core.config.settings import settings


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