# 04 Backend API and MCP

## FastAPI

### Endpoints

- POST /chat
- GET /chat/history
- GET /orders
- GET /orders/{id}
- POST /track
- GET /profile
- PATCH /preferences

## MCP Wrappers

- categories.py
- products.py
- delivery.py
- checkout.py
- tracking.py

## Services

- AuthService
- ChatService
- MemoryService
- OrderService
- MCPService

## Error Handling

- Retry MCP failures
- Validate tool inputs
- Structured logging
- Graceful fallbacks
