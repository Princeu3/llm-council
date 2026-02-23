"""FastAPI backend for LLM Council."""

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from . import storage
from .auth import get_current_user, init_clerk
from .config import AVAILABLE_MODELS, CHAIRMAN_MODEL, COUNCIL_MODELS
from .council import (
    calculate_aggregate_rankings,
    generate_conversation_title,
    run_full_council,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage PostgreSQL pool lifecycle."""
    init_clerk()
    await storage.create_pool()
    await storage.create_tables()
    yield
    await storage.close_pool()


app = FastAPI(title="LLM Council API", lifespan=lifespan)

# Enable CORS for local development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SendMessageRequest(BaseModel):
    content: str
    council_models: Optional[List[str]] = None
    chairman_model: Optional[str] = None

    @field_validator("council_models")
    @classmethod
    def validate_council_models(cls, v):
        if v is not None:
            if len(v) < 2:
                raise ValueError("At least 2 council models are required")
            invalid = [m for m in v if m not in AVAILABLE_MODELS]
            if invalid:
                raise ValueError(f"Invalid models: {invalid}")
        return v

    @field_validator("chairman_model")
    @classmethod
    def validate_chairman_model(cls, v):
        if v is not None and v not in AVAILABLE_MODELS:
            raise ValueError(f"Invalid chairman model: {v}")
        return v


class RenameRequest(BaseModel):
    title: str


class ConversationMetadata(BaseModel):
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


async def _get_conversation_or_404(conversation_id: str, user_id: str) -> Dict[str, Any]:
    """Fetch a conversation or raise 404."""
    conversation = await storage.get_conversation(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/models")
async def get_models(user_id: str = Depends(get_current_user)):
    """Return available models and defaults."""
    return {
        "available": AVAILABLE_MODELS,
        "default_council": COUNCIL_MODELS,
        "default_chairman": CHAIRMAN_MODEL,
    }


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations(user_id: str = Depends(get_current_user)):
    """List all conversations (metadata only)."""
    return await storage.list_conversations(user_id)


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(user_id: str = Depends(get_current_user)):
    """Create a new conversation."""
    conversation = await storage.create_conversation(str(uuid.uuid4()), user_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str, user_id: str = Depends(get_current_user)
):
    """Get a specific conversation with all its messages."""
    return await _get_conversation_or_404(conversation_id, user_id)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, user_id: str = Depends(get_current_user)
):
    """Delete a conversation."""
    deleted = await storage.delete_conversation(conversation_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@app.patch("/api/conversations/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    request: RenameRequest,
    user_id: str = Depends(get_current_user),
):
    """Rename a conversation."""
    await _get_conversation_or_404(conversation_id, user_id)
    await storage.update_conversation_title(conversation_id, request.title, user_id)
    return {"success": True, "title": request.title}


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    user_id: str = Depends(get_current_user),
):
    """Send a message and run the 3-stage council process (non-streaming)."""
    conversation = await _get_conversation_or_404(conversation_id, user_id)
    is_first_message = len(conversation["messages"]) == 0

    await storage.add_user_message(conversation_id, request.content)

    if is_first_message:
        title = await generate_conversation_title(request.content)
        await storage.update_conversation_title(conversation_id, title, user_id)

    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content, request.council_models, request.chairman_model
    )

    await storage.add_assistant_message(
        conversation_id, stage1_results, stage2_results, stage3_result
    )

    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata,
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(
    conversation_id: str,
    request: SendMessageRequest,
    user_id: str = Depends(get_current_user),
):
    """Send a message and stream the 3-stage council process via SSE."""
    conversation = await _get_conversation_or_404(conversation_id, user_id)
    is_first_message = len(conversation["messages"]) == 0

    def sse(event: Dict[str, Any]) -> str:
        return f"data: {json.dumps(event)}\n\n"

    async def event_generator():
        try:
            await storage.add_user_message(conversation_id, request.content)

            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(
                    generate_conversation_title(request.content)
                )

            yield sse({"type": "stage1_start"})
            stage1_results = await stage1_collect_responses(
                request.content, request.council_models
            )
            yield sse({"type": "stage1_complete", "data": stage1_results})

            yield sse({"type": "stage2_start"})
            stage2_results, label_to_model = await stage2_collect_rankings(
                request.content, stage1_results, request.council_models
            )
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield sse({
                "type": "stage2_complete",
                "data": stage2_results,
                "metadata": {
                    "label_to_model": label_to_model,
                    "aggregate_rankings": aggregate_rankings,
                },
            })

            yield sse({"type": "stage3_start"})
            stage3_result = await stage3_synthesize_final(
                request.content, stage1_results, stage2_results, request.chairman_model
            )
            yield sse({"type": "stage3_complete", "data": stage3_result})

            if title_task:
                title = await title_task
                await storage.update_conversation_title(conversation_id, title, user_id)
                yield sse({"type": "title_complete", "data": {"title": title}})

            await storage.add_assistant_message(
                conversation_id, stage1_results, stage2_results, stage3_result
            )

            yield sse({"type": "complete"})

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
