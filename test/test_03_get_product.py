import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_get_product",
        {
            "product_id": "cake00ka002034",
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())