# Kapuruka Shopping Agent: `agent.py` Code Breakdown

This document provides a phase-by-phase explanation of the `agent.py` file, which serves as the core orchestration engine for KIKO (the AI Shopping Agent). It uses **LangGraph** to manage state and route conversations.

---

## Phase 1: Setup and Agent Initialization
The code begins by importing dependencies, tools, and prompts. It then instantiates the LLM (OpenAI or Groq) and creates the individual "Worker Agents" using LangChain's `create_react_agent`.

```python
# Instantiate the LLM model
llm = ChatOpenAI(model=settings.llm_model, openai_api_key=settings.openai_api_key)

# Create Worker Agents
search_agent_node = create_react_agent(llm, tools=[...], prompt=...)
checkout_agent_node = create_react_agent(llm, tools=[...], prompt=...)
tracking_agent_node = create_react_agent(llm, tools=[...], prompt=...)
```
* **Purpose:** Sets up the raw brainpower. Each agent is given a specific system prompt and access to specific Kapruka APIs (tools).

---

## Phase 2: State Definition (The Shared Memory)
LangGraph requires a defined state that is passed around between nodes.

```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_node: str
    active_worker: str
    language: str
```
* **Purpose:** This dictionary is the shared memory of a chat session.
    * `messages`: The full chat history.
    * `active_worker`: The routing string (e.g., "Checkout") set by the Supervisor.
    * `language`: The user's preferred language.

---

## Phase 3: Utility & Helper Functions
Before diving into the logic, the file defines several helper functions to clean up and analyze messages.

* `trim_messages_for_llm`: Removes old messages to save tokens and prevent the LLM from crashing due to context limits.
* `_has_checkout_details`: Scans the user's messages using Regex to see if they have already provided a phone number, date, or Sri Lankan city.
* `_is_confirming_order_summary`: A safety rail that checks if the very last thing the AI did was show an `order_summary`, and if the user's latest message is "yes" or "proceed".

---

## Phase 4: The Supervisor Logic (The Brain)
The supervisor is the first node every message hits.

```python
async def supervisor_node(state: AgentState) -> dict:
    # ... feeds the prompt and messages to the LLM ...
    response = await llm.ainvoke(prompt)
    route = response.content.strip()
    # Validates and defaults to "Search" if broken
    return {"active_worker": route}
```
* **Purpose:** Analyzes the user's request and updates the state's `active_worker` field with `"Search"`, `"Checkout"`, or `"Tracking"`.

---

## Phase 5: The Worker Functions
These functions act as wrappers around the agents created in Phase 1. When triggered, they pass the trimmed chat history to the specific LLM.

```python
async def call_checkout_agent(state: AgentState) -> dict:
    # Safety Check: Can we create the order?
    if _is_confirming_order_summary(all_messages):
        # Proceed with checkout
        response = await checkout_agent_node.ainvoke({"messages": msgs})
        return {"messages": response["messages"]}
    # ...
```
* **Purpose:** Executes the specialized agent, allowing it to call tools and generate a final JSON response. Includes specific hardcoded logic (like the Checkout safety checks).

---

## Phase 6: The Graph Construction (The Train Tracks)
This is where all the isolated pieces above are wired together into a flow chart.

```python
workflow = StateGraph(AgentState)

# 1. Add all the stations (nodes)
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Search", call_search_agent)
workflow.add_node("Checkout", call_checkout_agent)
workflow.add_node("Tracking", call_tracking_agent)

# 2. Define the starting point
workflow.add_edge(START, "Supervisor")

# 3. Define the dynamic intersection
workflow.add_conditional_edges(
    "Supervisor",
    route_from_supervisor
)

# 4. Define the endpoints
workflow.add_edge("Search", END)
workflow.add_edge("Checkout", END)
workflow.add_edge("Tracking", END)
```
* **Purpose:** Visually and logically connects the system. 
  1. Start -> Supervisor.
  2. Supervisor uses `route_from_supervisor` to look at `active_worker` and decide which branch to take.
  3. The chosen branch (e.g., Checkout) runs, then hits `END`, finishing the cycle.

---

## Phase 7: Serialization
The final function in the file is `serialize_messages`.
* **Purpose:** LangChain generates complex Python objects (`AIMessage`, `HumanMessage`). The Next.js frontend cannot read these. This function cleans them up and converts them into standard, web-friendly JSON dictionaries before they are sent over the API.
