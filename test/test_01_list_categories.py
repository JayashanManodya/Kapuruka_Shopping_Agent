import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_list_categories",
        {
            "depth": 2,
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())