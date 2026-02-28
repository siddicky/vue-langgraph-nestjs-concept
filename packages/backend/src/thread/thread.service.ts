import { Injectable } from '@nestjs/common'
import { MemorySaver } from '@langchain/langgraph'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class ThreadService {
  private readonly checkpointer: MemorySaver

  constructor() {
    this.checkpointer = new MemorySaver()
  }

  getCheckpointer(): MemorySaver {
    return this.checkpointer
  }

  createThread(): string {
    return uuidv4()
  }
}
