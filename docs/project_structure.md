# Kapuruka Shopping Agent: Full Project Structure

This document outlines the entire file and folder architecture for KIKO. The project is separated into a Next.js **Frontend** and a FastAPI/LangGraph **Backend**.

---

## 📁 Root Directory
```text
Kapuruka_Shopping_Agent/
├── backend/                  # Python FastAPI + LangGraph AI engine
├── frontend/                 # Next.js 16 + React 19 web application
├── test/                     # Integration & End-to-End tests
├── .agents/                  # Agent memory and configurations
├── kapruka-mcp-reference.md  # API Reference docs for Kapruka APIs
└── README.md                 # Main project documentation
```

---

## 🧠 Backend (Python / FastAPI / LangGraph)
The backend is responsible for all AI logic, tool calling, and exposing the `/chat` endpoints to the frontend.

```text
backend/
├── main.py                     # Entry point for the Uvicorn/FastAPI server
├── pyproject.toml              # Python dependencies managed by 'uv'
├── uv.lock                     # Dependency lock file
├── .env                        # Environment variables (OPENAI_API_KEY, etc.)
└── app/
    ├── api.py                  # Defines FastAPI endpoints (e.g. POST /chat)
    └── core/                   # The core intelligence of the app
        ├── agents/
        │   ├── agent.py        # The LangGraph workflow (Supervisor -> Workers)
        │   └── tools.py        # Python functions that hit Kapruka APIs
        ├── config/
        │   ├── prompts.py      # System prompts & rules for every AI agent
        │   └── settings.py     # Configuration loaders (env vars, models)
        └── db/
            └── ...             # Stateful memory persistence (SQLite/PostgreSQL)
```
### Key Backend Files:
* `agent.py`: The "Train Tracks". It defines the StateGraph and routes messages.
* `tools.py`: The "Hands". Contains the `@tool` definitions that interact with Kapruka (e.g. `search_products`, `create_order`).
* `prompts.py`: The "Rules". Contains the exact wording and JSON specifications for how the AI must behave.

---

## 💻 Frontend (Next.js / React)
The frontend is a modern web application that renders the AI's JSON output into interactive React components (like product cards and checkout forms).

```text
frontend/
├── package.json                # NPM dependencies
├── next.config.ts              # Next.js build configuration
├── .env                        # Environment vars (NEXTAUTH_SECRET, API_URL)
└── src/
    ├── app/                    # Next.js App Router
    │   ├── page.tsx            # Main Chat UI (The core user interface)
    │   ├── layout.tsx          # Root HTML layout and metadata
    │   ├── globals.css         # Global styles and Tailwind/Vanilla CSS tokens
    │   ├── api/                # Next.js API Routes (Bridges UI to FastAPI)
    │   └── components/         # Reusable React UI Components
    │       ├── ProductCard.tsx # Renders 'product_detail' JSON
    │       ├── CartWidget.tsx  # Renders 'read_cart' JSON
    │       ├── Invoice.tsx     # Renders 'order_summary' JSON
    │       └── ...
    ├── context/                # React Context Providers
    │   └── ChatContext.tsx     # Manages the global state of the conversation
    └── hooks/                  # Custom React Hooks (e.g., useChat)
```
### Key Frontend Files:
* `page.tsx`: The primary interface where the user types messages and sees the agent's responses.
* `globals.css`: Contains the design tokens for the UI (dark mode, Kapruka brand colors).
* `api/`: Serves as a middleman, taking requests from the browser and securely forwarding them to the Python backend on port 8000.
