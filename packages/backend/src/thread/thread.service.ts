import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from '../langgraph-sdk/langgraph-sdk.constants';

@Injectable()
export class ThreadService {
  private checkpointer = new MemorySaver();
  private isRemote: boolean;

  constructor(
    private config: ConfigService,
    @Optional() @Inject(LANGGRAPH_CLIENT) private client?: Client,
  ) {
    this.isRemote = this.config.get<string>('LANGGRAPH_MODE', 'local') === 'remote';
  }

  getCheckpointer() {
    return this.checkpointer;
  }

  generateThreadId(): string {
    return randomUUID();
  }

  // --- Remote thread management methods ---

  async getThread(threadId: string) {
    this.ensureRemote('getThread');
    return this.client!.threads.get(threadId);
  }

  async deleteThread(threadId: string) {
    this.ensureRemote('deleteThread');
    await this.client!.threads.delete(threadId);
  }

  async searchThreads(query?: {
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
    status?: 'idle' | 'busy' | 'interrupted' | 'error';
  }) {
    this.ensureRemote('searchThreads');
    return this.client!.threads.search(query);
  }

  async copyThread(threadId: string) {
    this.ensureRemote('copyThread');
    return this.client!.threads.copy(threadId);
  }

  private ensureRemote(method: string): void {
    if (!this.isRemote || !this.client) {
      throw new Error(
        `${method}() is only available in remote mode (LANGGRAPH_MODE=remote)`,
      );
    }
  }
}
