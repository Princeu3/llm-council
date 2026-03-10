# LLM Council

![LLM Council](header.jpg)

Instead of asking one LLM and hoping for the best, **LLM Council** sends your question to multiple frontier models, has them anonymously peer-review each other's answers, and synthesizes a single best response.

## How It Works

When you submit a query, three stages run in sequence:

1. **Stage 1 — First Opinions**: Your query is sent in parallel to every council member (e.g. GPT-5.2, Claude Sonnet 4.6, Gemini 3.1 Pro, Grok 4.1). Each response is shown in its own tab so you can inspect them individually.

2. **Stage 2 — Peer Review**: Each model receives the other models' responses under anonymous labels ("Response A", "Response B", ...) and ranks them by accuracy and insight. Anonymization prevents models from playing favorites. You can read every model's raw evaluation and verify the parsed rankings yourself.

3. **Stage 3 — Final Response**: A designated Chairman model takes all responses and peer reviews, then synthesizes one definitive answer.

The entire pipeline is async and parallel where possible for minimal latency.

## Features

- **Multi-model deliberation** — configurable council of any OpenRouter-supported models
- **Anonymous peer review** — prevents bias in cross-model evaluation
- **Full transparency** — inspect every individual response, raw evaluation, and parsed ranking
- **Aggregate rankings** — see which model was rated best on average across all peer reviews
- **Conversation history** — persistent conversations stored in PostgreSQL
- **Authentication** — Clerk-based auth with GitHub and Google OAuth
- **SSE streaming** — real-time stage-by-stage updates as the council deliberates
- **Model settings** — configure council members and chairman from the UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.10+, async httpx |
| Frontend | React + Vite, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (asyncpg) |
| Auth | Clerk |
| LLM Gateway | OpenRouter |
| Package Mgmt | uv (Python), npm (JS) |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (for PostgreSQL)
- [uv](https://docs.astral.sh/uv/) package manager
- An [OpenRouter](https://openrouter.ai/) API key
- A [Clerk](https://clerk.com/) application (for auth)

### 1. Clone and install

```bash
git clone https://github.com/Princeu3/llm-council.git
cd llm-council

# Backend
uv sync

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure environment

Create `.env` in the project root:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=postgresql://llmcouncil:llmcouncil@localhost:5432/llm_council
CLERK_SECRET_KEY=sk_live_...
```

Create `frontend/.env.development`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run

```bash
# Option A: Use the start script
./scripts/start.sh

# Option B: Run manually
# Terminal 1 — Backend
uv run python -m backend.main

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Configure Models

Edit `backend/config.py` to customize which models sit on the council and which one chairs:

```python
COUNCIL_MODELS = [
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.2",
    "x-ai/grok-4.1-fast",
]

CHAIRMAN_MODEL = "google/gemini-3.1-pro-preview"
```

Any model available on [OpenRouter](https://openrouter.ai/models) works.

## Deployment

The project includes a `Dockerfile` and `railway.toml` for deploying the backend to [Railway](https://railway.com/). Add a PostgreSQL plugin and set the environment variables in the Railway dashboard.

## Credit

Originally inspired by [Andrej Karpathy's LLM Council concept](https://x.com/karpathy/status/1990577951671509438) for evaluating LLMs side-by-side while reading books with AI.

## License

MIT
