#!/bin/bash

# LLM Council - Start script
# Starts both backend and frontend servers for local development

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check required env vars
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set. Run ./scripts/setup.sh first."
    exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "Error: OPENROUTER_API_KEY not set. Run ./scripts/setup.sh first."
    exit 1
fi

echo "Starting LLM Council..."
echo ""

# Start PostgreSQL via Docker Compose
echo "Starting PostgreSQL..."
docker compose up -d
sleep 2

# Start backend with uvicorn (hot reload enabled)
echo "Starting backend on http://localhost:8001..."
uv run uvicorn backend.main:app --reload --port 8001 &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Save PIDs for stop script
echo "$BACKEND_PID" > /tmp/llm-council-backend.pid
echo "$FRONTEND_PID" > /tmp/llm-council-frontend.pid

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f /tmp/llm-council-*.pid; exit" SIGINT SIGTERM
wait
