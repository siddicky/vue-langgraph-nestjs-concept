# Vue + LangGraph.js + NestJS — AI Todo App

AI-powered todo app demonstrating **LangGraph.js interrupt handling**, **bidirectional shared state**, **SSE streaming**, and **LangGraph Platform API compatibility**.

Built with a Vue 3 frontend (using `@langchain/vue` `useStream`), a NestJS 11 backend implementing the LangGraph Platform API surface, and a shared types package.

## What It Demonstrates

- **Human-in-the-loop** — LangGraph `interrupt()` pauses the graph for destructive actions (delete, status change); the frontend shows an approval dialog and resumes with `Command({ resume })`
- **Bidirectional state sync** — Frontend pushes task updates to the backend via `POST /threads/:id/state`; the backend streams task changes back via SSE `values` events
- **Platform API compatibility** — The NestJS backend implements LangGraph Platform API routes (`/threads`, `/threads/:id/runs/stream`, etc.) so `@langchain/vue` `useStream` connects directly
- **Conversation branching** — `useStream` fetches state history and exposes `history`/`setBranch` for navigating conversation branches

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Pinia, Tailwind CSS 3, `@langchain/vue`, `@langchain/langgraph-sdk` |
| Backend | NestJS 11, LangGraph.js, `@langchain/openai`, `@langchain/anthropic` |
| Shared | TypeScript types (`Task`, `AgentState`, `PendingAction`, etc.) |
| Tooling | pnpm workspaces, Vite 6, Vitest, Jest |

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- An OpenAI or Anthropic API key

### Setup

```bash
# Clone
git clone https://github.com/siddicky/vue-langgraph-nestjs-concept.git
cd vue-langgraph-nestjs-concept

# Install dependencies
pnpm install

# Configure environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your API key(s)

# Run both backend and frontend
pnpm dev
```

The backend starts on `http://localhost:3000` and the frontend on `http://localhost:5173` (with a Vite proxy forwarding `/threads` to the backend).

## Architecture

### LangGraph StateGraph

```
START → chat → shouldContinue → parse_tool → approval → execute → shouldContinueAfterExecute → respond → END
                    ↓ no                                                     ↓ more pending
                   END                                                   approval (loop)
```

- **chat** — LLM decides what to do based on current tasks and messages
- **parse_tool** — Extracts all tool calls into a `pendingActions` array
- **approval** — Interrupts for destructive actions (`deleteTask`, `setTaskStatus`); `addTask` passes through
- **execute** — Batches additive actions or executes a single approved destructive action
- **respond** — LLM summarises what was done

### API Endpoints

The backend implements LangGraph Platform API-compatible routes:

| Method | Path | Description |
|---|---|---|
| `POST` | `/threads` | Create a new thread |
| `GET` | `/threads/:thread_id/state` | Get current graph state |
| `POST` | `/threads/:thread_id/state` | Update state (`{ values, as_node? }`) |
| `POST` | `/threads/:thread_id/runs/stream` | SSE stream (`{ input?, command?, assistant_id?, stream_mode? }`) |
| `POST` | `/threads/:thread_id/history` | State history (`{ limit? }`) |

## Project Structure

```
packages/
  shared/          # @todos/shared — TypeScript types (Task, AgentState, PendingAction, etc.)
  backend/         # NestJS 11 — LangGraph agent + Platform API endpoints
    src/
      agent/       # AgentController, AgentService, graph, tools, state
      thread/      # ThreadService (MemorySaver checkpointer)
    test/          # Jest tests
  frontend/        # Vue 3 + Vite 6 — UI + Pinia store
    src/
      stores/      # agent.ts — wraps @langchain/vue useStream
      components/  # AddTodo, TasksList, Task, AgentChat, InterruptDialog
      components/ui/  # shadcn-vue style primitives (Button, Input, Checkbox, Dialog, etc.)
      __tests__/   # Vitest tests
```

## Environment Variables

| Variable | Package | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | backend | — | Required when `LLM_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | backend | — | Required when `LLM_PROVIDER=anthropic` |
| `LLM_PROVIDER` | backend | `openai` | `"openai"` or `"anthropic"` |
| `PORT` | backend | `3000` | Backend listen port |
| `LANGSMITH_TRACING` | backend | — | Enable LangSmith tracing (`true`) |
| `LANGSMITH_API_KEY` | backend | — | LangSmith API key |
| `LANGSMITH_PROJECT` | backend | — | LangSmith project name |
| `VITE_API_URL` | frontend | `window.location.origin` | Backend API base URL |

See `packages/backend/.env.example` for a template.

## License

MIT
