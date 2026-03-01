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
- `Task`, `TaskStatus`, `AgentState`, `PendingAction`, `StreamEvent`, `InterruptPayload`
- Compiled with `tsc` to `dist/` (ESM)
- Frontend resolves directly from source via tsconfig path alias; backend requires built `dist/`

### `backend` — NestJS 11 + LangGraph.js
- **Modules**: `AppModule` → `AgentModule` + `ThreadModule` (global) + `ConfigModule` (global)
- **`AgentController`** — 5 endpoints under `/agent/`:
  - `POST /agent/thread` — create new thread
  - `POST /agent/:threadId/chat` — SSE stream (body: `{ message, tasks }`)
  - `POST /agent/:threadId/resume` — resume after interrupt (body: `{ response }`)
  - `GET /agent/:threadId/state` — get LangGraph state
  - `PUT /agent/:threadId/state` — push frontend state into graph
- **`AgentService`** — implements `OnModuleInit`, builds graph on init, wraps LangGraph execution as async generators yielding `StreamEvent`
- **`ThreadService`** — manages `MemorySaver` checkpointer (in-memory, ephemeral — state lost on restart)

#### LangGraph StateGraph (`agent.graph.ts`)
```
START → chat → [has tool_call?] → parse_tool → approval → execute → END
                    ↓ no
                   END
```
- **State**: `messages` (with `messagesStateReducer`), `tasks` (last-write-wins), `pendingAction`
- **Tools** (`agent.tools.ts`): `addTask`, `deleteTask`, `setTaskStatus` — `DynamicStructuredTool` with Zod schemas
- **Interrupt**: `approval` node calls `interrupt()` for destructive actions (`deleteTask`, `setTaskStatus`); `addTask` passes through. Resumed via `Command({ resume })`. Interrupt detected in stream via `chunk.__interrupt__`
- **Multi-LLM**: Switchable via `LLM_PROVIDER` env — OpenAI (`gpt-4o`) or Anthropic (`claude-sonnet-4-6`)

### `frontend` — Vue 3 + Vite 6 + Pinia + Tailwind CSS 3
- **`useAgentStream` composable** — all HTTP/SSE logic; manual `ReadableStream` reader parsing `text/event-stream` (double-newline split)
- **Pinia store** (`stores/agent.ts`) — wraps composable, seeds default tasks, adds local CRUD that syncs to backend via `pushTasks()`
- **UI components** (`components/ui/`) — shadcn-vue style, built on Radix Vue primitives (`Button`, `Input`, `Checkbox`, `Dialog`, `Label`), using `class-variance-authority` + `clsx` + `tailwind-merge`
- **App components**: `AddTodo`, `TasksList`, `Task`, `AgentChat`, `InterruptDialog`
- Uses `VITE_API_URL` (defaults to empty string — relative URLs through Vite proxy)
- No Vue Router (single page app)

## Environment Variables

| Variable | Package | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | backend | — | Required when `LLM_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | backend | — | Required when `LLM_PROVIDER=anthropic` |
| `LLM_PROVIDER` | backend | `openai` | `"openai"` or `"anthropic"` |
| `PORT` | backend | `3000` | Backend listen port |
| `VITE_API_URL` | frontend | `""` | Backend API base URL (empty = use Vite proxy) |

See `packages/backend/.env.example` for a template.

## Key Patterns

- **SSE streaming**: Backend yields `StreamEvent` objects as `text/event-stream`; frontend reads with `ReadableStream` API (not EventSource), splitting on `\n\n`
- **Bidirectional state sync**: Frontend pushes tasks to backend via `PUT /agent/:id/state`; backend pushes task updates to frontend via `state_update` SSE events
- **Human-in-the-loop**: LangGraph `interrupt()` in the approval node pauses the graph; frontend shows `InterruptDialog`; user response sent via `POST /agent/:id/resume` and resumed with `Command({ resume })`
- **Test structure**: Backend tests in `packages/backend/test/` (Jest + ts-jest), frontend tests in `packages/frontend/src/__tests__/` (Vitest + happy-dom + @vue/test-utils), shared tests in `packages/shared/test/` (Vitest)
- **No linting/formatting config**: No ESLint or Prettier is configured
- **Backend tsconfig is standalone** (does not extend `tsconfig.base.json`) — uses CommonJS module + Node resolution for NestJS compatibility
