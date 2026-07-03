import asyncio
from app.core.agents.tools import manage_cart
from app.api import current_cart

async def test():
    # Set up context var
    current_cart.set([])

    print("\n--- Test 1: ADD ---")
    res = await manage_cart.ainvoke({"action": "add", "product_id": "P1", "product_name": "Test Product", "price": 100})
    print(f"Result: {res}")
    print(f"Cart State: {current_cart.get()}")

    print("\n--- Test 2: VIEW ---")
    res = await manage_cart.ainvoke({"action": "view"})
    print(f"Result: {res}")

    print("\n--- Test 3: UPDATE ---")
    res = await manage_cart.ainvoke({"action": "update", "product_id": "P1", "quantity": 5})
    print(f"Result: {res}")
    print(f"Cart State: {current_cart.get()}")

    print("\n--- Test 4: REMOVE ---")
    res = await manage_cart.ainvoke({"action": "remove", "product_id": "P1"})
    print(f"Result: {res}")
    print(f"Cart State: {current_cart.get()}")

    print("\n--- Test 5: CLEAR ---")
    await manage_cart.ainvoke({"action": "add", "product_id": "P2", "product_name": "Another", "price": 50})
    res = await manage_cart.ainvoke({"action": "clear"})
    print(f"Result: {res}")
    print(f"Cart State: {current_cart.get()}")

if __name__ == "__main__":
    asyncio.run(test())
