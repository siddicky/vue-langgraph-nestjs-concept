# Plan: Integrate `@langchain/langgraph-sdk` into NestJS Services

## Goal

Replace the current local graph execution in the NestJS backend with `@langchain/langgraph-sdk` `Client`, enabling the backend to call a **remote** LangGraph Platform deployment while preserving NestJS's module/DI/controller structure. Retain the existing local-graph mode as a fallback.

---

## Current Architecture (Local Graph)

```
Frontend (Vue) → NestJS Controller → AgentService → buildAgentGraph() → local StateGraph + MemorySaver
                                      ThreadService → MemorySaver (in-memory)
```

- `AgentService` builds the graph at startup via `OnModuleInit`, wraps `graph.stream()` / `graph.getState()` etc.
- `ThreadService` holds a `MemorySaver` checkpointer and generates UUIDs.
- All graph execution is in-process — no remote calls.

## Target Architecture (Remote SDK)

```
Frontend (Vue) → NestJS Controller → AgentService → @langchain/langgraph-sdk Client → Remote LangGraph Platform
                                      ThreadService → Client.threads.*
                                      AssistantsService → Client.assistants.*  (NEW)
                                      CronsService → Client.crons.*  (NEW)
                                      StoreService → Client.store.*  (NEW)
```

- `Client` from `@langchain/langgraph-sdk` is configured once via a NestJS provider and injected into services.
- Each service maps NestJS DI patterns onto the SDK's sub-clients (`client.threads`, `client.runs`, `client.assistants`, `client.crons`, `client.store`).
- The controller layer stays unchanged — it delegates to the same service interface.
- A `LANGGRAPH_MODE` env var (`"local"` | `"remote"`) selects the execution backend at startup.

---

## Implementation Steps

### Step 1: Add `@langchain/langgraph-sdk` dependency to backend

**File**: `packages/backend/package.json`

Add `"@langchain/langgraph-sdk": "^1.6.1"` to `dependencies`.

Run `pnpm install` from root.

### Step 2: Create `LanggraphSdkModule` with `Client` provider

**New file**: `packages/backend/src/langgraph-sdk/langgraph-sdk.module.ts`

- Global NestJS module that provides a configured `Client` instance.
- `Client` is constructed using env vars: `LANGGRAPH_API_URL` (default `http://localhost:8123`), `LANGGRAPH_API_KEY` (optional).
- Uses `ConfigService` to read env vars.
- Exports a custom injection token `LANGGRAPH_CLIENT` so services can `@Inject(LANGGRAPH_CLIENT)`.

```typescript
// langgraph-sdk.module.ts
@Global()
@Module({
  providers: [
    {
      provide: LANGGRAPH_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Client({
          apiUrl: config.get('LANGGRAPH_API_URL', 'http://localhost:8123'),
          apiKey: config.get('LANGGRAPH_API_KEY'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [LANGGRAPH_CLIENT],
})
export class LanggraphSdkModule {}
```

**New file**: `packages/backend/src/langgraph-sdk/langgraph-sdk.constants.ts`

```typescript
export const LANGGRAPH_CLIENT = Symbol('LANGGRAPH_CLIENT');
```

**New file**: `packages/backend/src/langgraph-sdk/index.ts` (barrel export)

### Step 3: Create `RemoteAgentService` implementing a shared interface

**New file**: `packages/backend/src/agent/agent.service.interface.ts`

Extract the public API of `AgentService` into an interface:

```typescript
export interface IAgentService {
  createThread(): string | Promise<string>;
  getState(threadId: string): Promise<ThreadState>;
  updateState(threadId: string, values: Record<string, any>, asNode?: string): Promise<{ configurable: {...} }>;
  streamRun(threadId: string, body: StreamRunBody): AsyncGenerator<{ event: string; data: any }>;
  getHistory(threadId: string, limit?: number): Promise<ThreadState[]>;
}
```

**New file**: `packages/backend/src/agent/remote-agent.service.ts`

Implements `IAgentService` using the SDK Client:

```typescript
@Injectable()
export class RemoteAgentService implements IAgentService {
  constructor(@Inject(LANGGRAPH_CLIENT) private client: Client) {}

  async createThread(): Promise<string> {
    const thread = await this.client.threads.create();
    return thread.thread_id;
  }

  async getState(threadId: string): Promise<ThreadState> {
    const state = await this.client.threads.getState(threadId);
    // Map SDK ThreadState to our ThreadState interface
    return this.mapToThreadState(state, threadId);
  }

  async updateState(threadId: string, values: Record<string, any>, asNode?: string) {
    return this.client.threads.updateState(threadId, { values, asNode });
  }

  async *streamRun(threadId: string, body: StreamRunBody) {
    const assistantId = body.assistant_id || 'agent';
    const payload: any = {};

    if (body.command) {
      payload.command = body.command;
    } else if (body.input) {
      payload.input = body.input;
    }

    payload.streamMode = body.stream_mode || ['values', 'messages'];

    // Use client.runs.stream() which returns an async generator of SSE events
    const stream = this.client.runs.stream(threadId, assistantId, payload);

    for await (const event of stream) {
      yield { event: event.event, data: event.data };
    }
  }

  async getHistory(threadId: string, limit = 10): Promise<ThreadState[]> {
    const history = await this.client.threads.getHistory(threadId, { limit });
    return history.map(s => this.mapToThreadState(s, threadId));
  }
}
```

### Step 4: Rename existing `AgentService` → `LocalAgentService`

**File**: `packages/backend/src/agent/agent.service.ts`

- Rename class to `LocalAgentService` and have it implement `IAgentService`.
- No logic changes — just rename + implement interface.

### Step 5: Create a factory provider for mode switching

**File**: `packages/backend/src/agent/agent.module.ts`

Use a factory provider to select `LocalAgentService` or `RemoteAgentService` based on `LANGGRAPH_MODE` env var:

```typescript
@Module({
  controllers: [AgentController],
  providers: [
    LocalAgentService,
    RemoteAgentService,
    {
      provide: AGENT_SERVICE,
      useFactory: (config: ConfigService, local: LocalAgentService, remote: RemoteAgentService) => {
        return config.get('LANGGRAPH_MODE', 'local') === 'remote' ? remote : local;
      },
      inject: [ConfigService, LocalAgentService, RemoteAgentService],
    },
  ],
})
export class AgentModule {}
```

**File**: `packages/backend/src/agent/agent.controller.ts`

Update to inject via `@Inject(AGENT_SERVICE)` token instead of concrete class:

```typescript
constructor(@Inject(AGENT_SERVICE) private agentService: IAgentService) {}
```

### Step 6: Add new SDK-powered services for Platform features

These services expose LangGraph Platform management capabilities that only exist with the remote SDK.

#### 6a: `AssistantsService`

**New file**: `packages/backend/src/assistants/assistants.service.ts`

Wraps `client.assistants` methods:
- `search(query?)` — list available assistants
- `get(id)` — get assistant by ID
- `create(payload)` — create a new assistant
- `update(id, payload)` — update assistant config
- `delete(id)` — delete an assistant
- `getGraph(id)` — retrieve the assistant's graph definition
- `getSchemas(id)` — retrieve the assistant's input/output schemas

#### 6b: `AssistantsController`

**New file**: `packages/backend/src/assistants/assistants.controller.ts`

Endpoints:
- `GET /assistants` — search assistants
- `GET /assistants/:id` — get assistant
- `POST /assistants` — create assistant
- `PATCH /assistants/:id` — update assistant
- `DELETE /assistants/:id` — delete assistant
- `GET /assistants/:id/graph` — get graph visualization data
- `GET /assistants/:id/schemas` — get schemas

#### 6c: `AssistantsModule`

**New file**: `packages/backend/src/assistants/assistants.module.ts`

#### 6d: `CronsService` + `CronsController` + `CronsModule`

**New files**: `packages/backend/src/crons/`

Wraps `client.crons` methods:
- `POST /crons` — create a cron job
- `POST /threads/:thread_id/crons` — create cron for specific thread
- `GET /crons` — search/list cron jobs
- `DELETE /crons/:id` — delete a cron job

#### 6e: `StoreService` + `StoreController` + `StoreModule`

**New files**: `packages/backend/src/store/`

Wraps `client.store` methods:
- `PUT /store/items` — put an item
- `GET /store/items` — get an item
- `DELETE /store/items` — delete an item
- `POST /store/items/search` — search items
- `POST /store/namespaces` — list namespaces

### Step 7: Update `ThreadService` for remote mode

**File**: `packages/backend/src/thread/thread.service.ts`

Add SDK thread management methods that delegate to `client.threads`:
- `getThread(id)` — `client.threads.get(id)`
- `deleteThread(id)` — `client.threads.delete(id)`
- `searchThreads(query?)` — `client.threads.search(query)`
- `copyThread(id)` — `client.threads.copy(id)`

Keep the existing `MemorySaver` + `generateThreadId()` for local mode. Add conditional logic based on `LANGGRAPH_MODE`.

### Step 8: Register new modules in `AppModule`

**File**: `packages/backend/src/app.module.ts`

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LanggraphSdkModule,    // NEW — provides Client globally
    ThreadModule,
    AgentModule,
    AssistantsModule,       // NEW — only active in remote mode
    CronsModule,            // NEW — only active in remote mode
    StoreModule,            // NEW — only active in remote mode
  ],
})
export class AppModule {}
```

### Step 9: Add environment variables

**File**: `packages/backend/.env.example`

```env
# LangGraph execution mode: "local" (default) or "remote"
LANGGRAPH_MODE=local

# Remote LangGraph Platform settings (only used when LANGGRAPH_MODE=remote)
LANGGRAPH_API_URL=http://localhost:8123
LANGGRAPH_API_KEY=
```

**File**: `CLAUDE.md` — update Environment Variables table.

### Step 10: Write tests

#### 10a: `LanggraphSdkModule` test
**New file**: `packages/backend/test/langgraph-sdk/langgraph-sdk.module.spec.ts`
- Test that `Client` is constructed with correct config from env vars.
- Test default URL fallback.

#### 10b: `RemoteAgentService` tests
**New file**: `packages/backend/test/agent/remote-agent.service.spec.ts`
- Mock the `Client` object with jest.fn() for each sub-client method.
- Test `createThread()` delegates to `client.threads.create()`.
- Test `getState()` calls `client.threads.getState()` and maps result.
- Test `updateState()` calls `client.threads.updateState()`.
- Test `streamRun()` with input — calls `client.runs.stream()` and yields events.
- Test `streamRun()` with command (resume) — passes command through.
- Test `getHistory()` calls `client.threads.getHistory()` with limit.
- Test error propagation from SDK.

#### 10c: `AssistantsService` tests
**New file**: `packages/backend/test/assistants/assistants.service.spec.ts`
- Mock `client.assistants.*` methods.
- Test each CRUD operation.

#### 10d: `AssistantsController` tests
**New file**: `packages/backend/test/assistants/assistants.controller.spec.ts`
- Mock service, test each endpoint.

#### 10e: `CronsService` + `CronsController` tests
**New files**: `packages/backend/test/crons/`

#### 10f: `StoreService` + `StoreController` tests
**New files**: `packages/backend/test/store/`

#### 10g: Mode-switching test
**New file**: `packages/backend/test/agent/agent.module.spec.ts`
- Test that `LANGGRAPH_MODE=local` provides `LocalAgentService`.
- Test that `LANGGRAPH_MODE=remote` provides `RemoteAgentService`.

#### 10h: Update existing tests
- Rename `AgentService` references to `LocalAgentService` in `test/agent/agent.service.spec.ts`.
- Update controller tests to use `AGENT_SERVICE` token.
- Ensure all existing tests still pass.

### Step 11: Build verification

- Run `pnpm build:shared && pnpm --filter backend build` to verify TypeScript compilation.
- Run `pnpm --filter backend test` to verify all tests pass.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/langgraph-sdk/langgraph-sdk.module.ts` | Global module providing `Client` |
| `src/langgraph-sdk/langgraph-sdk.constants.ts` | Injection tokens |
| `src/langgraph-sdk/index.ts` | Barrel export |
| `src/agent/agent.service.interface.ts` | `IAgentService` interface |
| `src/agent/remote-agent.service.ts` | SDK-based remote agent service |
| `src/agent/agent.constants.ts` | `AGENT_SERVICE` token |
| `src/assistants/assistants.service.ts` | Wraps `client.assistants` |
| `src/assistants/assistants.controller.ts` | REST endpoints for assistants |
| `src/assistants/assistants.module.ts` | NestJS module |
| `src/crons/crons.service.ts` | Wraps `client.crons` |
| `src/crons/crons.controller.ts` | REST endpoints for crons |
| `src/crons/crons.module.ts` | NestJS module |
| `src/store/store.service.ts` | Wraps `client.store` |
| `src/store/store.controller.ts` | REST endpoints for store |
| `src/store/store.module.ts` | NestJS module |
| `test/langgraph-sdk/langgraph-sdk.module.spec.ts` | SDK module tests |
| `test/agent/remote-agent.service.spec.ts` | Remote service tests |
| `test/agent/agent.module.spec.ts` | Mode-switching tests |
| `test/assistants/*.spec.ts` | Assistants tests |
| `test/crons/*.spec.ts` | Crons tests |
| `test/store/*.spec.ts` | Store tests |

## Modified Files Summary

| File | Change |
|------|--------|
| `packages/backend/package.json` | Add `@langchain/langgraph-sdk` dep |
| `src/agent/agent.service.ts` | Rename to `LocalAgentService`, implement `IAgentService` |
| `src/agent/agent.module.ts` | Factory provider for mode switching |
| `src/agent/agent.controller.ts` | Inject via `AGENT_SERVICE` token |
| `src/thread/thread.service.ts` | Add remote thread methods |
| `src/app.module.ts` | Import new modules |
| `.env.example` | Add new env vars |
| `CLAUDE.md` | Update architecture & env var docs |
| `test/agent/agent.service.spec.ts` | Rename to `LocalAgentService` |
| `test/agent/agent.controller.spec.ts` | Use `AGENT_SERVICE` token |

---

## Key Design Decisions

1. **Interface-based abstraction**: `IAgentService` lets the controller work with either local or remote backend without code changes.

2. **Factory provider pattern**: NestJS DI selects the implementation at startup based on `LANGGRAPH_MODE` — no runtime branching in business logic.

3. **Global SDK module**: The `Client` instance is created once and shared across all services via DI, avoiding repeated construction.

4. **Backward compatibility**: `LANGGRAPH_MODE=local` (default) preserves the existing behavior — no breaking changes for users who don't need remote execution.

5. **Platform API parity**: The new services (assistants, crons, store) expose the full LangGraph Platform management API surface through NestJS endpoints, giving you the CLI's management features within NestJS's structured API.

6. **SSE passthrough**: In remote mode, `streamRun` yields events from `client.runs.stream()` directly, maintaining the same SSE format the frontend expects.
