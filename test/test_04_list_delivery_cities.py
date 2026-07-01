import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_list_delivery_cities",
        {
            "query": "Colombo",
            "limit": 20,
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())