import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph-checkpoint';

@Injectable()
export class ThreadService {
  private checkpointer = new MemorySaver();

  getCheckpointer() {
    return this.checkpointer;
  }

  generateThreadId(): string {
    return `thread_${randomUUID()}`;
  }
}
