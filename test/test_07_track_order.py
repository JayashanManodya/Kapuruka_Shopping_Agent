import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_track_order",
        {
            "order_number": "VIMP34456CB2",
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())