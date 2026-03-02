import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from '../langgraph-sdk/langgraph-sdk.constants';

@Injectable()
export class CronsService {
  constructor(
    @Inject(LANGGRAPH_CLIENT) private client: Client,
  ) {}

  async create(
    assistantId: string,
    payload?: {
      schedule: string;
      input?: Record<string, any>;
      metadata?: Record<string, any>;
      config?: Record<string, any>;
    },
  ) {
    return this.client.crons.create(assistantId, payload);
  }

  async createForThread(
    threadId: string,
    assistantId: string,
    payload?: {
      schedule: string;
      input?: Record<string, any>;
      metadata?: Record<string, any>;
      config?: Record<string, any>;
    },
  ) {
    return this.client.crons.createForThread(threadId, assistantId, payload);
  }

  async search(query?: {
    assistantId?: string;
    threadId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.client.crons.search(query);
  }

  async delete(cronId: string) {
    await this.client.crons.delete(cronId);
  }
}
