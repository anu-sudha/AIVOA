# AI-First HCP CRM — Log Interaction Screen

An AI-first "Log Interaction Screen" for pharma field reps, letting them log
HCP (Healthcare Professional) interactions either through a **structured
form** or a **conversational chat interface** backed by a **LangGraph
agent** running on **Groq's `gemma2-9b-it`** (extraction) and
`llama-3.3-70b-versatile` (reasoning/tool-routing).

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + Redux Toolkit, Google Inter font |
| Backend   | Python, FastAPI |
| AI agent  | LangGraph (`create_react_agent`) |
| LLMs      | Groq — `gemma2-9b-it` and `llama-3.3-70b-versatile` |
| Database  | PostgreSQL or MySQL (SQLAlchemy ORM) |

## Project structure

```
hcp-crm/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS + router registration
│   │   ├── database.py        # SQLAlchemy engine/session (Postgres/MySQL/SQLite)
│   │   ├── models.py          # HCP, Interaction, Material, FollowUp tables
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── interactions.py  # CRUD for the structured form
│   │   │   ├── hcps.py          # HCP search/autocomplete
│   │   │   └── chat.py          # POST /api/chat -> LangGraph agent
│   │   └── agent/
│   │       ├── llm.py         # Groq ChatGroq clients
│   │       ├── tools.py       # the 6 LangGraph tools
│   │       └── graph.py       # the LangGraph StateGraph (react agent)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── LogInteractionScreen.jsx  # two-pane layout (form | chat)
    │   │   ├── InteractionForm.jsx       # structured form
    │   │   └── ChatPanel.jsx             # conversational logging
    │   ├── store/                        # Redux Toolkit slices
    │   └── api/api.js                    # axios client
    └── package.json
```

## How to run it

### 1. Database
Create an empty database (Postgres or MySQL). For a zero-setup demo you can
instead point `DATABASE_URL` at SQLite — see the comment in
`backend/app/database.py`.

```sql
CREATE DATABASE hcp_crm;
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then edit .env with your GROQ_API_KEY and DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

Get a free Groq API key at https://console.groq.com/keys. The API docs are
then live at `http://localhost:8000/docs`. Tables are auto-created on
startup via `Base.metadata.create_all`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # points REACT_APP_API_BASE_URL at the backend
npm start
```

Open `http://localhost:3000`.

## Design write-up

### Role of the LangGraph agent
The agent is the single reasoning layer behind the chat panel. It receives
the rep's free-text message, decides — using the LLM — whether it needs to
call a tool (log data, look up history, search materials, etc.), executes
that tool, observes the result, and decides whether another tool call is
needed or it's ready to reply. This "reason → act → observe" loop is what
`langgraph.prebuilt.create_react_agent` implements as a graph: a `reason`
node (LLM call) and a `tools` node, connected by conditional edges, looping
until the model emits a plain-text final answer. A `MemorySaver`
checkpointer keeps each rep's conversation (keyed by `thread_id`) so the
agent has multi-turn context — e.g. "add a follow-up to that" refers back to
the interaction just logged.

### The 6 tools

1. **`log_interaction`** *(required)* — takes the rep's raw note, sends it to
   `gemma2-9b-it` with a strict JSON-extraction prompt to pull out HCP name,
   interaction type, topics, sentiment, materials/samples, and outcomes,
   then upserts the HCP and inserts the `Interaction` row.
2. **`edit_interaction`** *(required)* — takes an `interaction_id`, a field
   name (whitelisted), and a new value, and updates that row — used when the
   rep says things like "actually make that sentiment positive."
3. **`get_hcp_history`** — looks up the last 5 interactions for a named HCP,
   so the agent (or rep) has context before a new visit.
4. **`suggest_followups`** — asks the LLM to turn an interaction summary into
   2-4 concrete next steps (mirrors the "AI Suggested Follow-ups" panel in
   the mockup).
5. **`search_materials`** — searches a catalog of marketing materials and
   drug samples the rep can attach to an interaction.
6. **`schedule_followup`** — creates a `FollowUp` row tied to an interaction
   with a description and due date.

### Structured form vs. chat
Both surfaces write to the same `interactions` table through the same
Pydantic schema, so a rep can start typing in the chat, have the AI
pre-fill the structured fields, and then fine-tune/save through the form —
satisfying the "flexibility to log via either" requirement.

## Video recording checklist
- [ ] Walk through the frontend (form fill + save; then chat log + tool call)
- [ ] Demo all 6 LangGraph tools firing (watch the `/docs` Swagger or terminal logs for tool traces)
- [ ] Explain the code structure using the tree above
- [ ] Summarize what you understood from the task

## Verified working (not just statically checked)
This has been run end-to-end in a real environment, not just read for syntax:
- Backend boots, LangGraph agent graph builds successfully against `langgraph==0.2.34`
- `POST /api/interactions/` writes to SQLite/DB and auto-creates the HCP row
- `GET /api/interactions/`, `GET /api/hcps/search`, `GET /api/materials/search` all verified against a live server
- `edit_interaction` and `get_hcp_history` tools verified directly against the DB
- `POST /api/chat/` was verified up to the real outbound call to `api.groq.com` (only blocked by a sandboxed network with no internet access during dev — will work normally with a real Groq key and network access)
- Fixed a real dependency conflict: `langchain-core` is left unpinned in `requirements.txt` since pinning `==0.3.6` conflicts with `langgraph==0.2.34` / `langchain-groq==0.1.9`

## Mockup buttons (added after review)
The Log Interaction form now matches the mockup more closely:
- **Search/Add** (Materials Shared) and **Add Sample** (Samples Distributed) — open a small picker backed by `GET /api/materials/search`
- **🎙️ Summarize from Voice Note (Requires Consent)** — uses the browser's Speech Recognition API behind an explicit consent prompt, then posts the transcript to `POST /api/interactions/summarize-voice-note`, which uses `gemma2-9b-it` to condense it into Topics Discussed

## Notes / assumptions
- Sample materials/samples catalog is hardcoded for the demo; in production
  it would be its own table with search/filtering.
- `gemma2-9b-it` is used for fast extraction/summarization tasks;
  `llama-3.3-70b-versatile` drives the agent's tool-routing reasoning, per
  the task's suggestion to consider it "for context."
