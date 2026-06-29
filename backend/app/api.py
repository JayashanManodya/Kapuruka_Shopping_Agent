from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json

from app.core.agents.agent import shopping_agent, serialize_messages

app = FastAPI(title="Kapruka Shopping Agent API")

class ChatRequest(BaseModel):
    message: str
    thread_id: str

@app.post("/api/chat")
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    try:
        response = await shopping_agent.ainvoke(
            {
                "messages": [
                    {"role": "user", "content": request.message}
                ]
            },
            config=config,
        )
        
        # Get the latest assistant response
        latest_reply = ""
        if "messages" in response and response["messages"]:
            latest_reply = response["messages"][-1].content
            
        # Serialize the entire history
        history_json_str = serialize_messages(response.get("messages", []))
        history_list = json.loads(history_json_str)
        
        return {
            "response": latest_reply,
            "history": history_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="127.0.0.1", port=8000, reload=True)
