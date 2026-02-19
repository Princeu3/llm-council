"""FastAPI backend for LLM Council."""

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import storage
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


async def _get_conversation_or_404(conversation_id: str) -> Dict[str, Any]:
    """Fetch a conversation or raise 404."""
    conversation = await storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return await storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation():
    """Create a new conversation."""
    conversation = await storage.create_conversation(str(uuid.uuid4()))
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    return await _get_conversation_or_404(conversation_id)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    deleted = await storage.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@app.patch("/api/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, request: RenameRequest):
    """Rename a conversation."""
    await _get_conversation_or_404(conversation_id)
    await storage.update_conversation_title(conversation_id, request.title)
    return {"success": True, "title": request.title}


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """Send a message and run the 3-stage council process (non-streaming)."""
    conversation = await _get_conversation_or_404(conversation_id)
    is_first_message = len(conversation["messages"]) == 0

    await storage.add_user_message(conversation_id, request.content)

    if is_first_message:
        title = await generate_conversation_title(request.content)
        await storage.update_conversation_title(conversation_id, title)

    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content
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
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """Send a message and stream the 3-stage council process via SSE."""
    conversation = await _get_conversation_or_404(conversation_id)
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
            stage1_results = await stage1_collect_responses(request.content)
            yield sse({"type": "stage1_complete", "data": stage1_results})

            yield sse({"type": "stage2_start"})
            stage2_results, label_to_model = await stage2_collect_rankings(
                request.content, stage1_results
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
                request.content, stage1_results, stage2_results
            )
            yield sse({"type": "stage3_complete", "data": stage3_result})

            if title_task:
                title = await title_task
                await storage.update_conversation_title(conversation_id, title)
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
