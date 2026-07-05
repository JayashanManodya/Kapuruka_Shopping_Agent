# Kapuruka Shopping Agent (KIKO)

Kapuruka Shopping Agent (aka **KIKO**) is a full-stack, multilingual AI-powered shopping assistant built for Kapruka. It provides intelligent product recommendations, seamless conversational commerce, and shopping automation. By leveraging a Next.js frontend and a Python/FastAPI backend powered by LangGraph, it creates a robust multi-agent orchestration system that serves as a highly intelligent digital storefront.

## 🎯 Purpose
The primary purpose of KIKO is to automate and streamline the e-commerce experience. Through a natural, conversational chat interface, users can search for products, manage shopping carts, verify delivery options, place orders, and track shipments. This entirely eliminates the friction of traditional website navigation, providing an accessible and personalized shopping journey.

## ✨ Key Features
- **Conversational Commerce**: Shop, checkout, and track orders purely through natural language.
- **Multilingual Support**: Fully localized in English, Sinhala (Unicode), Singlish, Tamil (Unicode), and Tanglish, allowing users to communicate naturally in their native languages.
- **Agent Orchestration**: State-of-the-art AI multi-agent workflows using LangGraph for precise task delegation.
- **Intelligent Tooling**: Securely interfaces with Kapruka's internal APIs (products, cart, delivery, tracking) using custom tool definitions.
- **Interactive UI**: Responsive, fluid, and modern user interface built with Next.js 16 and React 19, featuring dynamic localized action buttons.
- **Persistent Memory**: Uses robust databases (PostgreSQL/SQLite) for stateful conversation checkpoints and cart persistence across sessions.

## 🧠 AI Agents Architecture
The backend uses a multi-agent system (LangGraph) to handle specific domains of the shopping journey:
- **Supervisor Agent**: The core orchestrator. Analyzes the user's intent and routes the request to the correct specialized worker.
- **Search Agent**: Browses categories, searches for items (e.g., Gifts, Flowers, Cakes, Chocolates), fetches product details, and adds items to the cart.
- **Checkout Agent**: Manages the checkout flow, validates delivery cities/dates via the `check_delivery` tool, and generates guest checkout orders.
- **Tracking Agent**: Checks real-time order statuses using a provided order number.

## 🚀 Advantages
- **Frictionless Shopping**: Users complete their entire journey from discovery to checkout without ever leaving the chat window.
- **Cultural & Linguistic Inclusion**: Native support for Sri Lankan languages and transliterations bridges the digital divide.
- **Stateful Interactions**: The agent remembers your cart contents, previous queries, and session context natively.
- **Extensible Architecture**: Easy to plug in new agent tools or additional LLM capabilities.

## 💻 Tech Stack
### Frontend
- **Framework**: Next.js 16
- **Library**: React 19
- **Styling/UI**: Lucide Icons, Custom CSS
- **Authentication**: NextAuth.js
- **Language**: TypeScript

### Backend
- **API Framework**: FastAPI, Uvicorn
- **AI/LLM**: LangChain, LangGraph, OpenAI
- **Database**: SQLModel, aiosqlite, asyncpg, PostgreSQL/SQLite
- **Language**: Python 3.14+

## 📁 Folder Structure
```
Kapuruka_Shopping_Agent/
├── backend/                # Python FastAPI application and AI Agent logic
│   ├── app/                # Main application code (API, Core, Agents, etc.)
│   ├── main.py             # FastAPI entry point
│   ├── pyproject.toml      # Backend dependencies (uv)
│   └── ...
├── frontend/               # Next.js React frontend
│   ├── src/                # Source code for pages and components (e.g. page.tsx)
│   ├── package.json        # Frontend dependencies
│   └── ...
└── test/                   # Integration and end-to-end tests
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+)
- Python (v3.14+)
- `uv` package manager for Python

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies and activate the virtual environment using `uv`:
   ```bash
   uv sync
   ```
3. Set up environment variables in `.env`:
   ```env
   OPENAI_API_KEY=your_key
   ```
4. Run the backend development server:
   ```bash
   uv run main.py
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env` or `.env.local`:
   ```env
   NEXTAUTH_SECRET=your_secret
   ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```

## 🌐 Development
- **Frontend**: Runs on `http://localhost:3000`.
- **Backend**: Runs on `http://localhost:8000`.

## 📜 License
This project is licensed under the MIT License.
