# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered todo app demonstrating **LangGraph.js interrupt handling**, **bidirectional shared state**, and **SSE streaming**. Monorepo with a Vue 3 frontend (powered by [assistant-ui-vue](https://github.com/siddicky/assistant-ui-vue)), NestJS 11 backend, and shared types package. Uses `@assistant-ui/vue` + `@assistant-ui/vue-langgraph` for the chat UI, replacing the previous `@langchain/vue` implementation.

## Commands

```bash
# Install
pnpm install

# Development (runs both backend and frontend concurrently)
pnpm dev

# Or individually:
pnpm --filter backend dev      # NestJS on :3000 (watch mode)
pnpm --filter frontend dev     # Vite on :5173 (proxies /threads → :3000)

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
- **`AgentController`** — LangGraph Platform-style endpoints:
  - `POST /threads` — create new thread
  - `GET /threads/:thread_id/state` — get thread state
  - `POST /threads/:thread_id/state` — update thread state
  - `POST /threads/:thread_id/runs/stream` — SSE stream (body: `{ input, command, assistant_id, stream_mode }`)
  - `POST /threads/:thread_id/history` — get conversation history
- **`AgentService`** — implements `OnModuleInit`, builds graph on init, wraps LangGraph execution as async generators yielding SSE events
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

### `frontend` — Vue 3 + Vite 6 + Pinia + Tailwind CSS 3 + assistant-ui-vue
- **`@assistant-ui/vue`** — Provides `AssistantRuntimeProvider`, `ThreadRoot`, `ThreadMessages`, `ComposerRoot`, `ComposerInput`, `ComposerSend`, `MessageRoot`, `MessageParts`, and other chat UI primitives
- **`@assistant-ui/vue-langgraph`** — Provides `useLangGraphRuntime` composable for LangGraph backend integration
- **`useTodosLangGraphRuntime` composable** (`composables/useTodosLangGraphRuntime.ts`) — Sets up the LangGraph runtime, manages thread lifecycle, handles task state sync from stream events
- **`chatApi.ts`** (`lib/chatApi.ts`) — API helper functions using `@langchain/langgraph-sdk` Client for thread creation, state management, and message streaming
- **Pinia store** (`stores/agent.ts`) — Manages task CRUD with optimistic updates and backend sync via `pushTasks()`
- **UI components** (`components/ui/`) — Native implementations for `Button`, `Input`, `Checkbox`, `Dialog`, `Label` using `class-variance-authority` + `clsx` + `tailwind-merge`
- **App components**: `AddTodo`, `TasksList`, `Task`, `AgentChat` (wraps assistant-ui-vue Thread), `InterruptDialog`
- **Vendored packages**: `@assistant-ui/vue`, `@assistant-ui/vue-langgraph`, `assistant-stream`, `@assistant-ui/cloud` are vendored as tarballs in `.vendor/` (not yet published to npm)
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

- **assistant-ui-vue integration**: `App.vue` wraps the app with `AssistantRuntimeProvider` using a runtime from `useTodosLangGraphRuntime()`. `AgentChat.vue` uses `ThreadRoot`, `ThreadMessages`, `ComposerRoot`, etc. for the chat UI.
- **SSE streaming**: Backend yields events as `text/event-stream`; frontend streams via `@langchain/langgraph-sdk` Client which `useTodosLangGraphRuntime` feeds into the assistant-ui-vue runtime
- **Bidirectional state sync**: Frontend pushes tasks to backend via `POST /threads/:id/state`; backend pushes task updates to frontend via `values` SSE events which the runtime composable intercepts
- **Human-in-the-loop**: LangGraph `interrupt()` in the approval node pauses the graph; frontend shows `InterruptDialog`; user response sent via resume stream which the runtime composable handles
- **Test structure**: Backend tests in `packages/backend/test/` (Jest + ts-jest), frontend tests in `packages/frontend/src/__tests__/` (Vitest + happy-dom + @vue/test-utils), shared tests in `packages/shared/test/` (Vitest)
- **No linting/formatting config**: No ESLint or Prettier is configured
- **Backend tsconfig is standalone** (does not extend `tsconfig.base.json`) — uses CommonJS module + Node resolution for NestJS compatibility
