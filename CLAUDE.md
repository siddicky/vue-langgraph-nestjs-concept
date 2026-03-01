# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered todo app demonstrating **LangGraph.js interrupt handling**, **bidirectional shared state**, **SSE streaming**, and **LangGraph Platform API compatibility**. Monorepo with a Vue 3 frontend (using `@langchain/vue` `useStream`), NestJS 11 backend, and shared types package. Ported from the CopilotKit example-todos-app, replacing CopilotKit with direct LangGraph.js integration.

## Commands

```bash
# Install
pnpm install

# Development (runs both backend and frontend concurrently)
pnpm dev

# Or individually:
pnpm --filter backend dev      # NestJS on :3000 (watch mode)
pnpm --filter frontend dev     # Vite on :5173 (proxies /threads, /runs → :3000)

# Build (order matters: shared → backend → frontend)
pnpm build
pnpm build:shared              # Must run before backend if shared types changed

# Tests
pnpm test                      # All packages sequentially
pnpm --filter backend test     # Jest (backend)
pnpm --filter frontend test    # Vitest (frontend)
pnpm --filter @todos/shared test  # Vitest (shared)

# Run a single test file
cd packages/backend && npx jest test/agent/agent.graph.spec.ts
cd packages/frontend && npx vitest run src/__tests__/agent.store.spec.ts
```

**Important**: Backend uses Jest (`*.spec.ts` in `test/`), frontend uses Vitest (`*.spec.ts` in `src/__tests__/`). The shared package also uses Vitest.

## Architecture

**Monorepo**: pnpm workspaces with three packages under `packages/`.

### `@todos/shared` — Shared TypeScript types
- `Task`, `TaskStatus`, `AgentState`, `PendingAction`, `InterruptPayload`
- `StreamEvent`/`StreamEventType` are deprecated (kept for backwards compatibility); frontend now uses `@langchain/vue` `useStream` which handles SSE parsing internally
- Compiled with `tsc` to `dist/` (ESM)
- Frontend resolves directly from source via tsconfig path alias; backend requires built `dist/`

### `backend` — NestJS 11 + LangGraph.js
- **Modules**: `AppModule` → `AgentModule` + `ThreadModule` (global) + `ConfigModule` (global)
- **`AgentController`** — LangGraph Platform API-compatible endpoints:
  - `POST /threads` — create new thread
  - `GET /threads/:thread_id/state` — get LangGraph state
  - `POST /threads/:thread_id/state` — update state (body: `{ values, as_node? }`)
  - `POST /threads/:thread_id/runs/stream` — SSE stream (body: `{ input?, command?, assistant_id?, stream_mode? }`)
  - `POST /threads/:thread_id/history` — state history (body: `{ limit? }`)
- **`AgentService`** — implements `OnModuleInit`, builds graph on init, wraps LangGraph execution as async generators yielding Platform API SSE events (`metadata`, `values`, `messages`)
- **`ThreadService`** — manages `MemorySaver` checkpointer (in-memory, ephemeral — state lost on restart)

#### LangGraph StateGraph (`agent.graph.ts`)
```
START → chat → shouldContinue → parse_tool → approval → execute → shouldContinueAfterExecute → respond → END
                    ↓ no                                                     ↓ more pending
                   END                                                   approval (loop)
```
- **State**: `messages` (with `messagesStateReducer`), `tasks` (last-write-wins), `pendingActions` (array of `PendingAction`)
- **Nodes**: `chat` (LLM decides), `parse_tool` (extracts all tool calls into `pendingActions`), `approval` (interrupts for destructive actions), `execute` (batches additive / single destructive), `respond` (LLM summarises what was done)
- **Tools** (`agent.tools.ts`): `addTask`, `deleteTask`, `setTaskStatus` — `DynamicStructuredTool` with Zod schemas
- **Interrupt**: `approval` node calls `interrupt()` for destructive actions (`deleteTask`, `setTaskStatus`); `addTask` passes through. Resumed via `Command({ resume })`. Interrupt surfaced to frontend via `useStream` interrupt ref
- **Multi-LLM**: Switchable via `LLM_PROVIDER` env — OpenAI (`gpt-5-mini`) or Anthropic (`claude-sonnet-4-6`)

### `frontend` — Vue 3 + Vite 6 + Pinia + Tailwind CSS 3
- **Pinia store** (`stores/agent.ts`) — wraps `@langchain/vue` `useStream` composable + `@langchain/langgraph-sdk` `Client`. Manages thread lifecycle, message streaming, interrupt handling, state history/branching, and local task CRUD with optimistic updates synced via `client.threads.updateState()`
- **No composables directory** — all stream/SSE logic is handled by `@langchain/vue` `useStream` internally
- **UI components** (`components/ui/`) — shadcn-vue style, built on Radix Vue primitives (`Button`, `Input`, `Checkbox`, `Dialog`, `Label`), using `class-variance-authority` + `clsx` + `tailwind-merge`
- **App components**: `AddTodo`, `TasksList`, `Task`, `AgentChat`, `InterruptDialog`
- Uses `VITE_API_URL` (defaults to `window.location.origin`)
- No Vue Router (single page app)

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

## Key Patterns

- **SSE streaming**: Backend emits Platform API SSE events (`metadata`, `values`, `messages/complete`, `messages/metadata`); frontend consumes via `@langchain/vue` `useStream` which handles SSE parsing, reconnection, and state management internally
- **Bidirectional state sync**: Frontend pushes tasks to backend via `POST /threads/:id/state` (using `@langchain/langgraph-sdk` `Client`); backend pushes task updates to frontend via `values` SSE events during streaming
- **Human-in-the-loop**: LangGraph `interrupt()` in the approval node pauses the graph; frontend shows `InterruptDialog`; user response sent via `stream.submit(null, { command: { resume: response } })` which calls `POST /threads/:id/runs/stream` with a `command` body
- **Branching**: `useStream` fetches state history (`fetchStateHistory: true`) and exposes `history`/`setBranch` for navigating conversation branches
- **Test structure**: Backend tests in `packages/backend/test/` (Jest + ts-jest), frontend tests in `packages/frontend/src/__tests__/` (Vitest + happy-dom + @vue/test-utils), shared tests in `packages/shared/test/` (Vitest)
- **No linting/formatting config**: No ESLint or Prettier is configured
- **Backend tsconfig is standalone** (does not extend `tsconfig.base.json`) — uses CommonJS module + Node resolution for NestJS compatibility
