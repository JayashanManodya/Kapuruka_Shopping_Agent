import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_check_delivery",
        {
            "city": "Colombo 03",
            "delivery_date": "2026-06-30",
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())