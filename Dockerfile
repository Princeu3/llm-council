# Dockerfile for LLM Council backend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock ./
COPY backend/ ./backend/

# Install dependencies
RUN uv sync --frozen --no-cache

# Railway provides PORT env var
ENV PORT=8001
EXPOSE $PORT

# Run the application (Railway sets PORT dynamically)
CMD uv run uvicorn backend.main:app --host 0.0.0.0 --port $PORT
