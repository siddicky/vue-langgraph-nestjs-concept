import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MemorySaver } from '@langchain/langgraph-checkpoint';

@Injectable()
export class ThreadService {
  private checkpointer = new MemorySaver();

  getCheckpointer() {
    return this.checkpointer;
  }

  generateThreadId(): string {
    return randomUUID();
  }
}
