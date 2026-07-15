from fastapi import APIRouter
from .. import schemas
from ..agent.graph import run_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest):
    reply, tool_calls = run_agent(payload.message, payload.thread_id)
    return schemas.ChatResponse(reply=reply, tool_calls=tool_calls)
