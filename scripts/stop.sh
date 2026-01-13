#!/bin/bash

# LLM Council - Stop script
# Stops any running backend and frontend servers

echo "Stopping LLM Council..."

# Try to read PIDs from files
BACKEND_PID=""
FRONTEND_PID=""

if [ -f /tmp/llm-council-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/llm-council-backend.pid)
fi

if [ -f /tmp/llm-council-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/llm-council-frontend.pid)
fi

# Kill by PID if available
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null && echo "  Stopped backend (PID: $BACKEND_PID)"
fi

if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null && echo "  Stopped frontend (PID: $FRONTEND_PID)"
fi

# Also kill by port as fallback
lsof -ti:8001 | xargs kill 2>/dev/null
lsof -ti:5173 | xargs kill 2>/dev/null

# Clean up PID files
rm -f /tmp/llm-council-*.pid

echo "Done."
