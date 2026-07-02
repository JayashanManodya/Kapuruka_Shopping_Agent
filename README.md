# Kapuruka Shopping Agent

Kapuruka Shopping Agent is a full-stack AI-powered shopping assistant that provides intelligent product recommendations, seamless conversational commerce, and shopping automation. The project utilizes a modern architecture comprising a Next.js frontend and a Python/FastAPI backend powered by LangChain and LangGraph for robust AI agent orchestration.

## Purpose

The primary purpose of the Kapuruka Shopping Agent is to automate and streamline the e-commerce experience. By providing a natural language interface, it allows users to search for products, manage their shopping carts, verify delivery options, place orders, and track shipments—all through an intuitive conversational chat interface, eliminating the need to manually navigate complex website menus.

## Features

- **Conversational Commerce**: Shop, checkout, and track orders purely through natural language.
- **Interactive UI**: Responsive and modern user interface built with Next.js 16 and React 19.
- **Agent Orchestration**: State-of-the-art AI multi-agent workflows using LangGraph.
- **Tool Integration**: Incorporates MCP (Model Context Protocol) to securely interface with Kapruka's APIs.
- **Robust Backend**: High-performance backend API built with FastAPI and SQLModel.
- **Persistent Memory**: Uses PostgreSQL/SQLite for stateful conversation checkpoints and persistent shopping cart memory.

## AI Agents Architecture

The backend uses a multi-agent system powered by LangGraph to handle different aspects of the shopping journey:

- **Supervisor Agent**: The orchestrator that analyzes the user's prompt and routes the request to the most appropriate specialized worker agent.
- **Search Agent**: Helps users browse categories, search for specific products, fetch detailed product information, and add items to their cart.
- **Checkout Agent**: Manages the checkout flow, including validating delivery cities, checking delivery dates, and generating guest checkout orders.
- **Tracking Agent**: Allows users to check the real-time status of their placed orders using an order number.
- **Verification Agent**: A final safety and quality check node that validates the AI's proposed response before it is sent back to the user, ensuring accuracy and helpfulness.

## Advantages

- **Frictionless Shopping**: Users can complete their entire shopping journey from discovery to checkout without leaving the chat window.
- **Intelligent Routing**: Specialized agents ensure high accuracy and tailored responses for specific tasks (e.g., tracking vs. searching).
- **Stateful Interactions**: The agent remembers your cart contents, previous queries, and preferences across the session.
- **Extensible Architecture**: The Model Context Protocol (MCP) and LangGraph setup make it incredibly easy to add new tools or agent behaviors in the future.

## Tech Stack

### Frontend
- **Framework**: Next.js 16
- **Library**: React 19
- **Authentication**: NextAuth.js
- **Language**: TypeScript

### Backend
- **API Framework**: FastAPI, Uvicorn
- **AI/LLM**: LangChain, LangGraph, Groq, OpenAI
- **Database**: SQLModel, aiosqlite, asyncpg, PostgreSQL/SQLite
- **Tooling**: Model Context Protocol (MCP) Adapters
- **Language**: Python 3.14+

## Folder Structure

```
Kapuruka_Shopping_Agent/
├── backend/                # Python FastAPI application and AI Agent logic
│   ├── app/                # Main application code (API, Core, Agents, etc.)
│   ├── main.py             # FastAPI entry point
│   ├── pyproject.toml      # Backend dependencies (uv)
│   └── ...
├── frontend/               # Next.js React frontend
│   ├── src/                # Source code for pages and components
│   ├── package.json        # Frontend dependencies
│   └── ...
└── test/                   # Integration and end-to-end tests
```

## Prerequisites

- Node.js (v20+)
- Python (v3.14+)
- `uv` package manager for Python

## Getting Started

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies and activate the virtual environment using `uv`:
   ```bash
   uv sync
   ```
3. Set up environment variables:
   Create a `.env` file in the `backend` directory and add your required keys (e.g., `GROQ_API_KEY`, `OPENAI_API_KEY`, database credentials).
4. Run the backend development server:
   ```bash
   uv run main.py
   ```
   *(or using uvicorn: `uvicorn app.api:app --reload`)*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` or `.env.local` file in the `frontend` directory with your necessary variables (e.g., `NEXTAUTH_SECRET`, backend API URLs).
4. Run the frontend development server:
   ```bash
   npm run dev
   ```

## Development

- **Frontend**: The frontend runs on `http://localhost:3000`.
- **Backend**: The backend API typically runs on `http://localhost:8000` (check your console output).

## License

This project is licensed under the MIT License.
