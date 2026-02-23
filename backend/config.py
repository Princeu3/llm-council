"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# All models available for selection in the UI
AVAILABLE_MODELS = [
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.2",
    "anthropic/claude-opus-4.5",
    "x-ai/grok-4.1-fast",
]

# Default council members - list of OpenRouter model identifiers
COUNCIL_MODELS = [
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.2",
    "x-ai/grok-4.1-fast",
]

# Default chairman model - synthesizes final response
CHAIRMAN_MODEL = "google/gemini-3.1-pro-preview"

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# PostgreSQL connection URL
DATABASE_URL = os.getenv("DATABASE_URL")
