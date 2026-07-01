# 03 LangGraph Multi-Agent System

## Agents

### Orchestrator
Routes requests.

### Profile Agent
Loads user profile.

### Memory Agent
Loads and updates memories.

### Shopping Agent
Uses:
- list_categories
- search_products
- get_product

### Delivery Agent
Uses:
- list_delivery_cities
- check_delivery

### Checkout Agent
Uses:
- create_order

### Tracking Agent
Uses:
- track_order

## State

```python
class ShoppingState(TypedDict):
    user: dict
    messages: list
    intent: str
    products: list
    cart: list
    delivery: dict
    order: dict
    memories: dict
```

## Workflow

```text
START
 |
Load User
 |
Load Memory
 |
Intent
 |
Shopping
 |
Delivery
 |
Checkout
 |
Save Order
 |
Update Memory
 |
END
```
