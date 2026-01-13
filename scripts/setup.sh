#!/bin/bash

# LLM Council - Setup script
# Run this once after cloning the repository

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "Setting up LLM Council..."
echo ""

# Check for required tools
echo "Checking dependencies..."

if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
echo "  uv: installed"

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    exit 1
fi
echo "  node: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi
echo "  npm: $(npm --version)"

echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
uv sync

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cat > .env << 'EOF'
# OpenRouter API Key (required)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# MongoDB URI (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/llm_council?retryWrites=true&w=majority
EOF
    echo "Please edit .env and add your API keys."
else
    echo "Checking .env configuration..."

    if ! grep -q "OPENROUTER_API_KEY" .env; then
        echo "  Warning: OPENROUTER_API_KEY not found in .env"
    else
        echo "  OPENROUTER_API_KEY: configured"
    fi

    if ! grep -q "MONGODB_URI" .env; then
        echo "  Warning: MONGODB_URI not found in .env"
        echo ""
        echo "  Add to your .env file:"
        echo "  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/llm_council"
    else
        echo "  MONGODB_URI: configured"
    fi
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure .env has OPENROUTER_API_KEY and MONGODB_URI set"
echo "  2. Run: ./scripts/start.sh"
