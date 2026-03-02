import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from '../langgraph-sdk/langgraph-sdk.constants';

@Injectable()
export class StoreService {
  constructor(
    @Inject(LANGGRAPH_CLIENT) private client: Client,
  ) {}

  async putItem(
    namespace: string[],
    key: string,
    value: Record<string, any>,
    options?: { index?: string[]; ttl?: number },
  ) {
    await this.client.store.putItem(namespace, key, value, options);
  }

  async getItem(
    namespace: string[],
    key: string,
    options?: { refreshTtl?: boolean },
  ) {
    return this.client.store.getItem(namespace, key, options);
  }

  async deleteItem(namespace: string[], key: string) {
    await this.client.store.deleteItem(namespace, key);
  }

  async searchItems(
    namespacePrefix: string[],
    options?: {
      filter?: Record<string, any>;
      limit?: number;
      offset?: number;
      query?: string;
    },
  ) {
    return this.client.store.searchItems(namespacePrefix, options);
  }

  async listNamespaces(options?: {
    prefix?: string[];
    suffix?: string[];
    maxDepth?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.client.store.listNamespaces(options);
  }
}
