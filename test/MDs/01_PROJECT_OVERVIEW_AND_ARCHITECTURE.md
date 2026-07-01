# 01 Project Overview and Architecture

## Vision
Build a production-grade AI shopping assistant for the Kapruka Agent Challenge using a Python backend powered by LangGraph and LangChain.

## Goals
- Personalized shopping
- End-to-end checkout
- Order tracking
- Persistent chat history
- User memory
- Multi-agent orchestration

## Tech Stack
- Frontend: Next.js, React, Tailwind, shadcn/ui
- Auth: Clerk
- Backend: FastAPI
- AI: LangGraph, LangChain, OpenAI
- Database: PostgreSQL + pgvector
- Cache: Redis
- ORM: SQLAlchemy
- Migration: Alembic

## High-Level Architecture

```text
Next.js
   |
Clerk
   |
FastAPI
   |
LangGraph Orchestrator
   |
+-------------------------------+
| Profile | Shopping | Delivery |
| Checkout| Tracking | Memory   |
+-------------------------------+
   |
Kapruka MCP
```

## Functional Requirements

- Login with Clerk
- Chat interface
- Product discovery
- Delivery validation
- Guest checkout
- Order tracking
- Chat history
- Order history
- Personalized recommendations

## Folder Structure

```text
frontend/
backend/
docs/
docker/
```

## Development Phases

1. Authentication
2. Chat
3. MCP Integration
4. Memory
5. Checkout
6. Tracking
7. Personalization
8. Deployment
