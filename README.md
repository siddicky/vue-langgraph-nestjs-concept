# Vue.js + LangGraph.js + NestJS Concept Project

> An AI-powered todo app demonstrating **LangGraph.js interrupt handling**, **bidirectional shared state**, and **SSE streaming** — ported from the [CopilotKit example-todos-app](https://github.com/CopilotKit/example-todos-app/tree/final), replacing CopilotKit's React SDK with direct LangGraph.js integration on a NestJS backend and a Vue.js frontend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vue 3 Frontend                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  TasksList   │  │  AgentChat   │  │ InterruptDialog  │   │
│  │  AddTodo     │  │  (SSE UI)    │  │  (approve/reject)│   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                   │              │
│  ┌──────▼─────────────────▼───────────────────▼─────────┐   │
│  │              Pinia Store (agent.ts)                    │   │
│  │         useAgentStream composable (SSE + fetch)        │   │
│  └─────────────────────────┬──────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP / SSE
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Backend                          │
│                                                              │
│  POST /agent/thread          → create thread                 │
│  POST /agent/:id/chat        → stream SSE response           │
│  POST /agent/:id/resume      → resume after interrupt        │
│  GET  /agent/:id/state       → get shared state              │
│  PUT  /agent/:id/state       → push frontend state           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AgentService                            │    │
│  │  streamChat() → AsyncGenerator<StreamEvent>          │    │
│  │  resumeAfterInterrupt() → AsyncGenerator<StreamEvent>│    │
│  └─────────────────────┬───────────────────────────────┘    │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  LangGraph.js StateGraph                      │
│                                                              │
│  START → chat → [tool call?] → parse_tool → approval → END   │
│                                              ↓               │
│                                    interrupt() ← destructive │
│                                    actions need approval      │
│                                              ↓               │
│                                           execute            │
│                                              ↓               │
│                                    state.tasks updated        │
└─────────────────────────────────────────────────────────────┘
```

---

## What This Project Demonstrates

| Feature | Description |
|---|---|
| **LangGraph.js Interrupts** | Human-in-the-loop approval flow for destructive actions (delete, status change) using `interrupt()` |
| **Bidirectional Shared State** | Vue UI can push task changes to the agent; the agent can push task changes to the UI via SSE `state_update` events |
| **SSE Streaming** | NestJS streams `StreamEvent` objects to Vue using plain `text/event-stream` + `ReadableStream` reader |
| **Monorepo with Shared Types** | `@todos/shared` package exports `Task`, `AgentState`, `StreamEvent`, etc. used by both frontend and backend |

---

## Ported From

This project is ported from the **[CopilotKit example-todos-app](https://github.com/CopilotKit/example-todos-app/tree/final)**:

| Original (CopilotKit) | This Project |
|---|---|
| React + Next.js frontend | Vue 3 + Vite frontend |
| CopilotKit React SDK | Plain `fetch` + `ReadableStream` SSE client |
| CopilotKit cloud/runtime | NestJS backend with LangGraph.js |
| `useCopilotReadable` / `useCopilotAction` | Pinia store + `useAgentStream` composable |
| `CopilotChat` component | Custom `AgentChat.vue` component |
| LangGraph (Python) agent | LangGraph.js (`@langchain/langgraph`) agent |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue 3 (Composition API) |
| Build tool | Vite 5 |
| State management | Pinia |
| Styling | Tailwind CSS |
| Backend framework | NestJS 10 |
| AI agent | LangGraph.js (`@langchain/langgraph`) |
| LLM | ChatOpenAI (`@langchain/openai`) |
| Language | TypeScript 5 (100% across all packages) |
| Monorepo | pnpm workspaces |

---

## Monorepo Structure

```
vue-langgraph-nestjs-concept/
├── pnpm-workspace.yaml
├── package.json                    # root workspace config
├── tsconfig.base.json              # shared TS config
├── .gitignore
├── .env.example
├── README.md
│
├── packages/
│   ├── shared/                     # @todos/shared — shared types
│   │   └── src/
│   │       ├── index.ts
│   │       ├── tasks.types.ts      # Task, TaskStatus
│   │       └── agent.types.ts      # AgentState, InterruptPayload, StreamEvent
│   │
│   ├── backend/                    # @todos/backend — NestJS + LangGraph.js
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── agent/
│   │       │   ├── agent.module.ts
│   │       │   ├── agent.controller.ts   # REST + SSE endpoints
│   │       │   ├── agent.service.ts      # streamChat, resume, getState, updateState
│   │       │   ├── agent.graph.ts        # StateGraph: chat → parse_tool → approval → execute
│   │       │   ├── agent.tools.ts        # addTask, deleteTask, setTaskStatus
│   │       │   └── agent.state.ts        # Annotation-based state
│   │       └── thread/
│   │           ├── thread.module.ts
│   │           └── thread.service.ts     # MemorySaver checkpointer
│   │
│   └── frontend/                   # @todos/frontend — Vue 3 + Vite + Pinia
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── style.css
│           ├── components/
│           │   ├── TasksList.vue
│           │   ├── AddTodo.vue
│           │   ├── Task.vue
│           │   ├── AgentChat.vue
│           │   └── InterruptDialog.vue
│           ├── composables/
│           │   └── useAgentStream.ts     # SSE + fetch client
│           ├── stores/
│           │   └── agent.ts              # Pinia store
│           ├── types/
│           │   └── index.ts
│           └── data/
│               └── default-tasks.ts      # 5 seed tasks
```

---

## Key Concepts

### 1. LangGraph.js StateGraph with `interrupt()`

The agent graph has 4 nodes:

```
START → chat → [has tool call?] → parse_tool → approval → execute → END
                      ↓ no
                     END
```

In the `approval` node, **destructive actions** (delete, status change) call `interrupt()`:

```typescript
// agent.graph.ts
const userResponse = interrupt({
  question: `Do you want me to delete task #${id}?`,
  options: ['yes', 'no'],
  pendingAction,
})
// graph suspends here until resumed
```

The graph is resumed via `new Command({ resume: 'yes' | 'no' })`.

### 2. NestJS SSE Streaming

The controller streams `StreamEvent` objects using Node.js `Response`:

```typescript
// agent.controller.ts
res.setHeader('Content-Type', 'text/event-stream')
for await (const event of this.agentService.streamChat(threadId, message)) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}
res.end()
```

Event types: `message_chunk`, `state_update`, `interrupt`, `done`, `error`.

### 3. Bidirectional Shared State (UI ↔ Agent)

- **Agent → UI**: On `state_update` events, the composable updates `tasks.value`
- **UI → Agent**: `pushTasks()` calls `PUT /agent/:id/state` which runs `graph.updateState()`

### 4. Human-in-the-Loop Approval Flow

1. User sends: *"Delete task #3"*
2. Agent calls `deleteTask` tool → `approval` node calls `interrupt()`
3. Backend yields `{ type: 'interrupt', data: { question, pendingAction } }`
4. Frontend shows `<InterruptDialog>` modal
5. User clicks "Yes" → `resumeWithInput('yes')` → `POST /agent/:id/resume`
6. Graph resumes, `execute` node deletes the task
7. Backend yields `{ type: 'state_update', data: { tasks: [...] } }`
8. Frontend updates task list

---

## API Endpoints

| Method | Path | Purpose | SSE? |
|---|---|---|---|
| `POST` | `/agent/thread` | Create a new thread | No |
| `POST` | `/agent/:threadId/chat` | Send a message, stream response | **Yes** |
| `POST` | `/agent/:threadId/resume` | Resume after interrupt | **Yes** |
| `GET` | `/agent/:threadId/state` | Get current agent state | No |
| `PUT` | `/agent/:threadId/state` | Push frontend state to agent | No |

---

## State Synchronization Flows

### Flow 1: User adds task manually (UI → Agent)
```
User types in AddTodo.vue
  → store.addTask(title)
    → local task added to tasks.value
    → pushTasks() → PUT /agent/:id/state
      → graph.updateState({ tasks })
```

### Flow 2: User asks AI to delete task (Agent → UI)
```
User types "delete task #2" in AgentChat.vue
  → store.sendMessage("delete task #2")
    → POST /agent/:id/chat → SSE stream
      → chat node: LLM calls deleteTask tool
      → parse_tool node: pendingAction = { tool: 'deleteTask', args: { id: 2 } }
      → approval node: interrupt() fires
        → SSE: { type: 'interrupt', data: { question, pendingAction } }
          → InterruptDialog.vue shows
```

### Flow 3: User approves interrupt
```
User clicks "Yes" in InterruptDialog.vue
  → store.resumeWithInput('yes')
    → POST /agent/:id/resume → SSE stream
      → execute node: tasks filtered (task #2 removed)
        → SSE: { type: 'state_update', data: { tasks: [...] } }
          → tasks.value updated in UI
```

### Flow 4: Agent adds task (Agent → UI)
```
User types "add task: buy milk"
  → chat node: LLM calls addTask tool
  → parse_tool node: pendingAction = { tool: 'addTask', args: { title: 'buy milk' } }
  → approval node: addTask skips approval
  → execute node: new task added to state.tasks
    → SSE: { type: 'state_update', data: { tasks: [...] } }
      → tasks.value updated in UI
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- OpenAI API key

### Install

```bash
# Clone the repo
git clone https://github.com/siddicky/vue-langgraph-nestjs-concept
cd vue-langgraph-nestjs-concept

# Install all workspace dependencies
pnpm install
```

### Environment Setup

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env and set OPENAI_API_KEY

# Frontend (optional — defaults to localhost:3000)
cp packages/frontend/.env.example packages/frontend/.env
```

### Run Dev Servers

```bash
# Terminal 1: Backend
pnpm dev:backend

# Terminal 2: Frontend
pnpm dev:frontend
```

Open http://localhost:5173 in your browser.

---

## Implementation Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Monorepo root config (pnpm workspaces, tsconfig.base) | ✅ |
| 2 | `@todos/shared` types package | ✅ |
| 3 | NestJS backend scaffolding | ✅ |
| 4 | `ThreadService` with MemorySaver | ✅ |
| 5 | `agent.state.ts` Annotation-based state | ✅ |
| 6 | `agent.tools.ts` Zod-schema tools | ✅ |
| 7 | `agent.graph.ts` StateGraph with interrupt | ✅ |
| 8 | `AgentService` streamChat/resume/getState/updateState | ✅ |
| 9 | `AgentController` REST + SSE endpoints | ✅ |
| 10 | Vue frontend scaffolding (Vite + Pinia + Tailwind) | ✅ |
| 11 | `useAgentStream` composable (SSE client) | ✅ |
| 12 | Pinia `agent` store with CRUD | ✅ |
| 13 | Vue components (TasksList, AddTodo, Task, AgentChat, InterruptDialog) | ✅ |

---

## Environment Variables

### `packages/backend/.env.example`
```
OPENAI_API_KEY=your-openai-api-key-here
PORT=3000
```

### `packages/frontend/.env.example`
```
VITE_API_URL=http://localhost:3000
```

---

## References

- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangGraph.js Human-in-the-loop](https://langchain-ai.github.io/langgraphjs/how-tos/human_in_the_loop/wait-user-input/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Original CopilotKit example-todos-app](https://github.com/CopilotKit/example-todos-app/tree/final)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia State Management](https://pinia.vuejs.org/)
