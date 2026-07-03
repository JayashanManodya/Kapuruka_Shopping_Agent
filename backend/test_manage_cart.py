import asyncio
import httpx
import json

async def test_cart():
    url = "http://127.0.0.1:8000/api/chat"
    
    # Base request helper
    async def send_chat(message: str, current_cart: list = None):
        if current_cart is None:
            current_cart = []
        payload = {
            "messages": [{"role": "user", "content": message}],
            "cart": current_cart
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"Error: {resp.status_code} - {resp.text}")
                return None, current_cart
            data = resp.json()
            return data.get("structured_response", {}), data.get("cart", current_cart)

    print("\n--- Test 1: ADD ---")
    sr, cart = await send_chat("Add product EF_PC_ADUL0V2810P00305 to my cart", [])
    print(f"Updated Cart: {json.dumps(cart, indent=2)}")
    
    print("\n--- Test 2: VIEW ---")
    sr, cart = await send_chat("What is in my cart?", cart)
    print(f"Agent reply: {sr.get('message')}")
    print(f"Updated Cart: {json.dumps(cart, indent=2)}")

    print("\n--- Test 3: UPDATE ---")
    sr, cart = await send_chat("Change the quantity of EF_PC_ADUL0V2810P00305 to 5", cart)
    print(f"Updated Cart: {json.dumps(cart, indent=2)}")

    print("\n--- Test 4: REMOVE ---")
    sr, cart = await send_chat("Remove EF_PC_ADUL0V2810P00305 from my cart", cart)
    print(f"Updated Cart: {json.dumps(cart, indent=2)}")

    print("\n--- Test 5: CLEAR ---")
    # First add something back
    sr, cart = await send_chat("Add product EF_PC_ADUL0V2810P00305 to my cart", cart)
    sr, cart = await send_chat("Clear my cart", cart)
    print(f"Updated Cart: {json.dumps(cart, indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_cart())
