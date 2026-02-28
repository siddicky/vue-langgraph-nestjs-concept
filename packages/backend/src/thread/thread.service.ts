import { Injectable } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph-checkpoint';

@Injectable()
export class ThreadService {
  private checkpointer = new MemorySaver();

  getCheckpointer() {
    return this.checkpointer;
  }

  generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
