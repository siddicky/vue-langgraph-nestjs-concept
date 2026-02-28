import { Injectable } from '@nestjs/common'
import { ThreadService } from '../thread/thread.service'
import { buildAgentGraph } from './agent.graph'
import { HumanMessage } from '@langchain/core/messages'
import { Command } from '@langchain/langgraph'
import { StreamEvent, Task } from '@todos/shared'
import { AIMessage } from '@langchain/core/messages'

@Injectable()
export class AgentService {
  private graph: ReturnType<typeof buildAgentGraph>

  constructor(private readonly threadService: ThreadService) {
    this.graph = buildAgentGraph(this.threadService.getCheckpointer())
  }

  createThread(): string {
    return this.threadService.createThread()
  }

  async *streamChat(threadId: string, message: string): AsyncGenerator<StreamEvent> {
    const config = { configurable: { thread_id: threadId } }
    const input = { messages: [new HumanMessage(message)] }

    try {
      for await (const event of await this.graph.stream(input, {
        ...config,
        streamMode: 'updates',
      })) {
        for (const [nodeName, nodeUpdate] of Object.entries(event)) {
          const update = nodeUpdate as any

          if (nodeName === 'chat' && update.messages) {
            const lastMsg = update.messages[update.messages.length - 1] as AIMessage
            if (lastMsg && typeof lastMsg.content === 'string' && lastMsg.content) {
              yield { type: 'message_chunk', data: { content: lastMsg.content } }
            }
          }

          if (nodeName === 'execute' && update.tasks !== undefined) {
            yield { type: 'state_update', data: { tasks: update.tasks } }
          }
        }
      }

      // Check if there's an interrupt in the state
      const state = await this.graph.getState(config)
      if (state.interrupts && (state.interrupts as any[]).length > 0) {
        const interruptValue = (state.interrupts as any[])[0].value
        yield { type: 'interrupt', data: interruptValue }
      }

      yield { type: 'done', data: null }
    } catch (err: any) {
      if (err?.name === 'GraphInterrupt') {
        // The graph raised an interrupt — get the interrupt payload from state
        const state = await this.graph.getState(config)
        const pendingInterrupts = (state as any).interrupts
        if (pendingInterrupts && pendingInterrupts.length > 0) {
          yield { type: 'interrupt', data: pendingInterrupts[0].value }
        }
        yield { type: 'done', data: null }
        return
      }
      yield { type: 'error', data: { message: err?.message || 'Unknown error' } }
    }
  }

  async *resumeAfterInterrupt(threadId: string, userResponse: string): AsyncGenerator<StreamEvent> {
    const config = { configurable: { thread_id: threadId } }

    try {
      const command = new Command({ resume: userResponse })

      for await (const event of await this.graph.stream(command, {
        ...config,
        streamMode: 'updates',
      })) {
        for (const [nodeName, nodeUpdate] of Object.entries(event)) {
          const update = nodeUpdate as any

          if (nodeName === 'chat' && update.messages) {
            const lastMsg = update.messages[update.messages.length - 1] as AIMessage
            if (lastMsg && typeof lastMsg.content === 'string' && lastMsg.content) {
              yield { type: 'message_chunk', data: { content: lastMsg.content } }
            }
          }

          if (nodeName === 'execute' && update.tasks !== undefined) {
            yield { type: 'state_update', data: { tasks: update.tasks } }
          }
        }
      }

      yield { type: 'done', data: null }
    } catch (err: any) {
      yield { type: 'error', data: { message: err?.message || 'Unknown error' } }
    }
  }

  async getState(threadId: string) {
    const config = { configurable: { thread_id: threadId } }
    const state = await this.graph.getState(config)
    return state.values
  }

  async updateState(threadId: string, patch: { tasks?: Task[] }) {
    const config = { configurable: { thread_id: threadId } }
    await this.graph.updateState(config, patch)
  }
}
