"""PostgreSQL-based storage for conversations."""

import json
from typing import Any, Dict, List, Optional

import asyncpg

from .config import DATABASE_URL

_pool: Optional[asyncpg.Pool] = None


async def _init_connection(conn):
    """Register JSONB codec on each new connection."""
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )


async def create_pool():
    """Create the asyncpg connection pool."""
    global _pool
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set")
    _pool = await asyncpg.create_pool(DATABASE_URL, init=_init_connection)


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def create_tables():
    """Create tables if they don't exist (idempotent)."""
    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                title TEXT NOT NULL DEFAULT 'New Conversation',
                messages JSONB NOT NULL DEFAULT '[]'::jsonb
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_created_at
            ON conversations (created_at DESC)
        """)


async def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """Create a new conversation."""
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO conversations (id) VALUES ($1)
            RETURNING id, created_at, title, messages
            """,
            conversation_id,
        )
    return _row_to_dict(row)


async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Load a conversation from storage."""
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, created_at, title, messages FROM conversations WHERE id = $1",
            conversation_id,
        )
    return _row_to_dict(row) if row else None


async def save_conversation(conversation: Dict[str, Any]):
    """Save (upsert) a full conversation."""
    async with _pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO conversations (id, created_at, title, messages)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE
            SET title = EXCLUDED.title, messages = EXCLUDED.messages
            """,
            conversation["id"],
            conversation["created_at"],
            conversation.get("title", "New Conversation"),
            conversation.get("messages", []),
        )


async def list_conversations() -> List[Dict[str, Any]]:
    """List all conversations (metadata only)."""
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, created_at, title, jsonb_array_length(messages) AS message_count
            FROM conversations
            ORDER BY created_at DESC
            """
        )
    return [
        {
            "id": row["id"],
            "created_at": row["created_at"].isoformat(),
            "title": row["title"],
            "message_count": row["message_count"],
        }
        for row in rows
    ]


async def _append_message(conversation_id: str, message: Dict[str, Any]):
    """Atomically append a message to a conversation's messages array."""
    async with _pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE conversations
            SET messages = messages || jsonb_build_array($2::jsonb)
            WHERE id = $1
            """,
            conversation_id,
            message,
        )
    if result == "UPDATE 0":
        raise ValueError(f"Conversation {conversation_id} not found")


async def add_user_message(conversation_id: str, content: str):
    """Atomically append a user message to a conversation."""
    await _append_message(conversation_id, {"role": "user", "content": content})


async def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
):
    """Atomically append an assistant message with all 3 stages."""
    await _append_message(conversation_id, {
        "role": "assistant", "stage1": stage1, "stage2": stage2, "stage3": stage3,
    })


async def update_conversation_title(conversation_id: str, title: str):
    """Update the title of a conversation."""
    async with _pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE conversations SET title = $2 WHERE id = $1",
            conversation_id,
            title,
        )
    if result == "UPDATE 0":
        raise ValueError(f"Conversation {conversation_id} not found")


async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation. Returns True if deleted, False if not found."""
    async with _pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM conversations WHERE id = $1",
            conversation_id,
        )
    return result == "DELETE 1"


def _row_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    """Convert an asyncpg Record to the conversation dict format."""
    return {
        "id": row["id"],
        "created_at": row["created_at"].isoformat(),
        "title": row["title"],
        "messages": row["messages"],
    }
