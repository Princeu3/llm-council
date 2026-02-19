"""OpenRouter API client for making LLM requests."""

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0,
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter.

    Returns dict with 'content' and optional 'reasoning_details', or None on failure.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"model": model, "messages": messages}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            response.raise_for_status()

            message = response.json()["choices"][0]["message"]
            return {
                "content": message.get("content"),
                "reasoning_details": message.get("reasoning_details"),
            }
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Query multiple models in parallel. Returns dict mapping model ID to response."""
    tasks = [query_model(model, messages) for model in models]
    responses = await asyncio.gather(*tasks)
    return dict(zip(models, responses))
