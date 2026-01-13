"""MongoDB-based storage for conversations."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGODB_URI

# MongoDB client singleton
_client: Optional[AsyncIOMotorClient] = None
_db = None


async def get_db():
    """Get MongoDB database connection (singleton)."""
    global _client, _db
    if _db is None:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI environment variable not set")
        _client = AsyncIOMotorClient(MONGODB_URI)
        _db = _client.llm_council
    return _db


async def get_conversations_collection():
    """Get the conversations collection."""
    db = await get_db()
    return db.conversations


async def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        New conversation dict
    """
    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }

    collection = await get_conversations_collection()
    await collection.insert_one(conversation)

    # Remove MongoDB's _id for the response
    conversation.pop("_id", None)
    return conversation


async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    collection = await get_conversations_collection()
    conversation = await collection.find_one({"id": conversation_id})

    if conversation:
        conversation.pop("_id", None)

    return conversation


async def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    collection = await get_conversations_collection()
    await collection.replace_one(
        {"id": conversation["id"]},
        conversation,
        upsert=True
    )


async def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Returns:
        List of conversation metadata dicts
    """
    collection = await get_conversations_collection()
    cursor = collection.find({}).sort("created_at", -1)

    conversations = []
    async for doc in cursor:
        conversations.append({
            "id": doc["id"],
            "created_at": doc["created_at"],
            "title": doc.get("title", "New Conversation"),
            "message_count": len(doc.get("messages", []))
        })

    return conversations


async def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    collection = await get_conversations_collection()
    result = await collection.update_one(
        {"id": conversation_id},
        {"$push": {"messages": {"role": "user", "content": content}}}
    )

    if result.matched_count == 0:
        raise ValueError(f"Conversation {conversation_id} not found")


async def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any]
):
    """
    Add an assistant message with all 3 stages to a conversation.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
    """
    collection = await get_conversations_collection()
    result = await collection.update_one(
        {"id": conversation_id},
        {"$push": {"messages": {
            "role": "assistant",
            "stage1": stage1,
            "stage2": stage2,
            "stage3": stage3
        }}}
    )

    if result.matched_count == 0:
        raise ValueError(f"Conversation {conversation_id} not found")


async def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    collection = await get_conversations_collection()
    result = await collection.update_one(
        {"id": conversation_id},
        {"$set": {"title": title}}
    )

    if result.matched_count == 0:
        raise ValueError(f"Conversation {conversation_id} not found")


async def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        True if deleted, False if not found
    """
    collection = await get_conversations_collection()
    result = await collection.delete_one({"id": conversation_id})
    return result.deleted_count > 0
