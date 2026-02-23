"""Clerk authentication for FastAPI endpoints."""

import os
from typing import Optional

import httpx
from clerk_backend_api import Clerk
from clerk_backend_api.security import AuthenticateRequestOptions
from fastapi import HTTPException, Request

_clerk: Optional[Clerk] = None
_authorized_parties: Optional[list[str]] = None


def init_clerk():
    """Initialize Clerk SDK. Call once at startup."""
    global _clerk, _authorized_parties
    secret = os.getenv("CLERK_SECRET_KEY")
    if not secret:
        raise ValueError("CLERK_SECRET_KEY environment variable not set")
    _clerk = Clerk(bearer_auth=secret)
    parties = os.getenv("CLERK_AUTHORIZED_PARTIES", "")
    _authorized_parties = [p.strip() for p in parties.split(",") if p.strip()] or None


async def get_current_user(request: Request) -> str:
    """FastAPI dependency that verifies Clerk JWT and returns user_id.

    Converts the incoming Starlette request into an httpx.Request
    (required by the Clerk SDK) and validates the session token.
    """
    if _clerk is None:
        raise RuntimeError("Clerk not initialized — call init_clerk() first")

    # Build httpx.Request from the Starlette request
    httpx_request = httpx.Request(
        method=request.method,
        url=str(request.url),
        headers=dict(request.headers),
    )

    opts = AuthenticateRequestOptions(authorized_parties=_authorized_parties)
    request_state = _clerk.authenticate_request(httpx_request, opts)

    if not request_state.is_signed_in:
        raise HTTPException(
            status_code=401,
            detail=request_state.reason or "Unauthorized",
        )

    user_id = request_state.payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")

    return user_id
