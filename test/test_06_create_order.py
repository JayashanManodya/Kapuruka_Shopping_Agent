import asyncio

from mcp_client import KaprukaMCPClient


async def main():

    client = KaprukaMCPClient()

    result = await client.call(
        "kapruka_create_order",
        {
            "cart": [
                {
                    "product_id": "cake00ka002034",
                    "quantity": 1
                }
            ],
            "recipient": {
                "name": "John Doe",
                "phone": "0771234567"
            },
            "delivery": {
                "address": "123 Main Street",
                "city": "Colombo 03",
                "date": "2026-07-15"
            },
            "sender": {
                "name": "OpenAI",
                "anonymous": False
            },
            "gift_message": "Happy Birthday",
            "response_format": "json"
        }
    )

    print(result)


asyncio.run(main())