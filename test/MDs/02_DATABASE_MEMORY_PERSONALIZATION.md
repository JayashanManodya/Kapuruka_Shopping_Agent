# 02 Database, Memory and Personalization

## Tables

### users
- id
- clerk_id
- email
- name
- avatar

### conversations
- id
- user_id
- title
- summary

### messages
- id
- conversation_id
- role
- content

### orders
- id
- kapruka_order_id
- status
- payment_status

### order_items
- id
- order_id
- product_id
- quantity

### memories
- id
- user_id
- key
- value
- importance

## Memory Types

- Session memory
- Long-term memory
- Semantic memory
- User preferences

## Personalization

Remember:
- Preferred city
- Budget
- Language
- Favorite categories
- Previous purchases
- Frequent recipients

Update memory after every completed conversation and order.
