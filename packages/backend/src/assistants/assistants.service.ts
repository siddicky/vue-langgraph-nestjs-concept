import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from '../langgraph-sdk/langgraph-sdk.constants';

@Injectable()
export class AssistantsService {
  constructor(
    @Inject(LANGGRAPH_CLIENT) private client: Client,
  ) {}

  async search(query?: {
    graphId?: string;
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
  }) {
    return this.client.assistants.search(query);
  }

  async get(assistantId: string) {
    return this.client.assistants.get(assistantId);
  }

  async create(payload: {
    graphId: string;
    config?: Record<string, any>;
    metadata?: Record<string, any>;
    assistantId?: string;
    name?: string;
    description?: string;
  }) {
    return this.client.assistants.create(payload);
  }

  async update(
    assistantId: string,
    payload: {
      graphId?: string;
      config?: Record<string, any>;
      metadata?: Record<string, any>;
      name?: string;
      description?: string;
    },
  ) {
    return this.client.assistants.update(assistantId, payload);
  }

  async delete(assistantId: string) {
    await this.client.assistants.delete(assistantId);
  }

  async getGraph(assistantId: string, options?: { xray?: boolean | number }) {
    return this.client.assistants.getGraph(assistantId, options);
  }

  async getSchemas(assistantId: string) {
    return this.client.assistants.getSchemas(assistantId);
  }
}
