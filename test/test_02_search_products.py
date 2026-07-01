import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_search_products",
        {
            "q": "Chocolate Cake",
            "limit": 10,
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())