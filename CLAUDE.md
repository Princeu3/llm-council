# CLAUDE.md - Technical Notes for LLM Council

This file contains technical details, architectural decisions, and important implementation notes for future development sessions.

## Project Overview

LLM Council is a 3-stage deliberation system where multiple LLMs collaboratively answer user questions. The key innovation is anonymized peer review in Stage 2, preventing models from playing favorites.

## Architecture

### Backend Structure (`backend/`)

**`config.py`**
- Contains `COUNCIL_MODELS` (list of OpenRouter model identifiers)
- Contains `CHAIRMAN_MODEL` (model that synthesizes final answer)
- Uses environment variable `OPENROUTER_API_KEY` from `.env`
- Backend runs on **port 8001** (NOT 8000 - user had another app on 8000)

**`openrouter.py`**
- `query_model()`: Single async model query
- `query_models_parallel()`: Parallel queries using `asyncio.gather()`
- Returns dict with 'content' and optional 'reasoning_details'
- Graceful degradation: returns None on failure, continues with successful responses

**`council.py`** - The Core Logic
- `stage1_collect_responses()`: Parallel queries to all council models
- `stage2_collect_rankings()`:
  - Anonymizes responses as "Response A, B, C, etc."
  - Creates `label_to_model` mapping for de-anonymization
  - Prompts models to evaluate and rank (with strict format requirements)
  - Returns tuple: (rankings_list, label_to_model_dict)
  - Each ranking includes both raw text and `parsed_ranking` list
- `stage3_synthesize_final()`: Chairman synthesizes from all responses + rankings
- `parse_ranking_from_text()`: Extracts "FINAL RANKING:" section, handles both numbered lists and plain format
- `calculate_aggregate_rankings()`: Computes average rank position across all peer evaluations

**`auth.py`** - Clerk Authentication
- `init_clerk()`: Reads `CLERK_SECRET_KEY`, creates Clerk SDK instance, reads optional `CLERK_AUTHORIZED_PARTIES`
- `get_current_user(request) -> str`: FastAPI dependency that verifies Clerk JWT
  - Converts Starlette Request to httpx.Request (required by Clerk SDK)
  - Calls `sdk.authenticate_request()` with authorized parties
  - Returns `user_id` (JWT `sub` claim) or raises 401

**`storage.py`**
- PostgreSQL-based conversation storage using asyncpg (async driver)
- Uses `DATABASE_URL` environment variable for connection
- Connection pool created at startup via FastAPI lifespan, closed at shutdown
- Single `conversations` table with JSONB `messages` column + `user_id TEXT` column
- Each conversation: `{id, user_id, created_at, title, messages[]}`
- All queries scoped by `user_id` for multi-tenant isolation
- Assistant messages contain: `{role, stage1, stage2, stage3}`
- Atomic message appends via `messages || jsonb_build_array()`
- Note: metadata (label_to_model, aggregate_rankings) is NOT persisted to storage, only returned via API

**`main.py`**
- FastAPI app with CORS enabled for all origins
- Uses `lifespan` context manager for Clerk init + PostgreSQL pool init/shutdown + table creation
- All endpoints except `GET /` (health check) require `Depends(get_current_user)`
- POST `/api/conversations/{id}/message/stream` - SSE streaming endpoint (preferred)
- POST `/api/conversations/{id}/message` - Non-streaming endpoint
- DELETE `/api/conversations/{id}` - Delete conversation
- PATCH `/api/conversations/{id}` - Rename conversation
- Metadata includes: label_to_model mapping and aggregate_rankings

### Frontend Structure (`frontend/src/`)

**`App.jsx`**
- Main orchestration: manages conversations list and current conversation
- Uses SSE streaming for real-time stage updates
- Auth gate: `<SignedOut>` shows landing page, `<SignedIn>` shows app
- Wires `getToken` from `useAuth()` into API client on mount
- Handles message sending and metadata storage

**`api.js`**
- API client with SSE streaming support via `sendMessageStream()`
- Uses `VITE_API_BASE` env var or defaults to `http://localhost:8001`
- `setTokenGetter(fn)` + `getAuthHeaders()` transparently inject `Authorization: Bearer` on all requests

**`components/ChatInterface.jsx`**
- Multiline textarea (3 rows, resizable)
- Enter to send, Shift+Enter for new line
- User messages wrapped in markdown-content class for padding

**`components/Stage1.jsx`**
- Tab view of individual model responses
- ReactMarkdown rendering with markdown-content wrapper

**`components/Stage2.jsx`**
- **Critical Feature**: Tab view showing RAW evaluation text from each model
- De-anonymization happens CLIENT-SIDE for display (models receive anonymous labels)
- Shows "Extracted Ranking" below each evaluation so users can validate parsing
- Aggregate rankings shown with average position and vote count
- Explanatory text clarifies that boldface model names are for readability only

**`components/Stage3.jsx`**
- Final synthesized answer from chairman
- Green-tinted background (#f0fff0) to highlight conclusion

**Styling (`*.css`)**
- Light mode theme (not dark mode)
- Primary color: #4a90e2 (blue)
- Global markdown styling in `index.css` with `.markdown-content` class
- 12px padding on all markdown content to prevent cluttered appearance

## Key Design Decisions

### Stage 2 Prompt Format
The Stage 2 prompt is very specific to ensure parseable output:
```
1. Evaluate each response individually first
2. Provide "FINAL RANKING:" header
3. Numbered list format: "1. Response C", "2. Response A", etc.
4. No additional text after ranking section
```

This strict format allows reliable parsing while still getting thoughtful evaluations.

### De-anonymization Strategy
- Models receive: "Response A", "Response B", etc.
- Backend creates mapping: `{"Response A": "openai/gpt-5.1", ...}`
- Frontend displays model names in **bold** for readability
- Users see explanation that original evaluation used anonymous labels
- This prevents bias while maintaining transparency

### Error Handling Philosophy
- Continue with successful responses if some models fail (graceful degradation)
- Never fail the entire request due to single model failure
- Log errors but don't expose to user unless all models fail

### UI/UX Transparency
- All raw outputs are inspectable via tabs
- Parsed rankings shown below raw text for validation
- Users can verify system's interpretation of model outputs
- This builds trust and allows debugging of edge cases

## Important Implementation Details

### Relative Imports
All backend modules use relative imports (e.g., `from .config import ...`) not absolute imports. This is critical for Python's module system to work correctly when running as `python -m backend.main`.

### Port Configuration
- Backend: 8001 (changed from 8000 to avoid conflict)
- Frontend: 5173 (Vite default)
- Update both `backend/main.py` and `frontend/src/api.js` if changing

### Local Development Scripts
Located in `scripts/` folder:
- `setup.sh` - Initial setup (install deps, check env vars)
- `start.sh` - Start both backend and frontend
- `stop.sh` - Stop running servers

### Authentication (Clerk)
- Frontend uses `@clerk/clerk-react` for sign-in/sign-up (GitHub + Google OAuth)
- Backend uses `clerk-backend-api` SDK to verify JWTs from frontend
- `ClerkProvider` wraps `<App />` in `main.jsx`
- `UserButton` displayed in sidebar header for account management
- All API calls include `Authorization: Bearer <clerk_session_token>`
- Backend `get_current_user` dependency extracts `user_id` from JWT `sub` claim
- Conversations are scoped by `user_id` column in PostgreSQL

### Environment Variables
Required in `.env`:
- `OPENROUTER_API_KEY` - API key for OpenRouter
- `DATABASE_URL` - PostgreSQL connection URL (e.g. `postgresql://llmcouncil:llmcouncil@localhost:5432/llm_council`)
- `CLERK_SECRET_KEY` - Clerk secret key for JWT verification

Required in `frontend/.env.development` / `frontend/.env.production`:
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key for frontend SDK

Optional:
- `CLERK_AUTHORIZED_PARTIES` - Comma-separated list of authorized party URLs (for JWT `azp` claim validation)

### Markdown Rendering
All ReactMarkdown components must be wrapped in `<div className="markdown-content">` for proper spacing. This class is defined globally in `index.css`.

### Model Configuration
Models are hardcoded in `backend/config.py`. Chairman can be same or different from council members. The current default is Gemini as chairman per user preference.

## Common Gotchas

1. **Module Import Errors**: Always run backend from project root, not from backend directory
2. **CORS Issues**: Currently allows all origins (`*`), restrict in production if needed
3. **Ranking Parse Failures**: If models don't follow format, fallback regex extracts any "Response X" patterns in order
4. **Missing Metadata**: Metadata is ephemeral (not persisted), only available in API responses
5. **PostgreSQL Connection**: Ensure `DATABASE_URL` is set in `.env` and PostgreSQL is running (`docker compose up -d`) before starting backend

## Deployment

### Local Development
```bash
./scripts/setup.sh   # First time setup
docker compose up -d # Start PostgreSQL
./scripts/start.sh   # Start servers (also runs docker compose up -d)
./scripts/stop.sh    # Stop servers
```

### Railway (Production)
- Dockerfile in project root for backend deployment
- Uses uv for Python dependency management
- Add Railway PostgreSQL plugin — it auto-injects `DATABASE_URL`
- Environment variables set in Railway dashboard:
  - `OPENROUTER_API_KEY`
  - `DATABASE_URL` (auto-injected by PostgreSQL plugin)
  - `CLERK_SECRET_KEY`
  - `COUNCIL_MODELS` (optional, defaults in config.py)
  - `CHAIRMAN_MODEL` (optional, defaults in config.py)
- Frontend Railway service needs:
  - `VITE_CLERK_PUBLISHABLE_KEY` (build arg)

## Future Enhancement Ideas

- Configurable council/chairman via UI instead of config file
- Export conversations to markdown/PDF
- Model performance analytics over time
- Custom ranking criteria (not just accuracy/insight)
- Support for reasoning models (o1, etc.) with special handling

## Testing Notes

Use `test_openrouter.py` to verify API connectivity and test different model identifiers before adding to council. The script tests both streaming and non-streaming modes.

## Data Flow Summary

```
User Query
    ↓
Stage 1: Parallel queries → [individual responses]
    ↓
Stage 2: Anonymize → Parallel ranking queries → [evaluations + parsed rankings]
    ↓
Aggregate Rankings Calculation → [sorted by avg position]
    ↓
Stage 3: Chairman synthesis with full context
    ↓
Return: {stage1, stage2, stage3, metadata}
    ↓
Frontend: Display with tabs + validation UI
```

The entire flow is async/parallel where possible to minimize latency.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
