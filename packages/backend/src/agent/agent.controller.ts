import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { AgentService } from './agent.service';

@Controller()
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post('threads')
  createThread() {
    const thread_id = this.agentService.createThread();
    const now = new Date().toISOString();
    return {
      thread_id,
      created_at: now,
      updated_at: now,
      metadata: {},
      status: 'idle',
      values: {},
    };
  }

  @Get('threads/:thread_id/state')
  async getState(@Param('thread_id') threadId: string) {
    return this.agentService.getState(threadId);
  }

  @Post('threads/:thread_id/state')
  @HttpCode(200)
  async updateState(
    @Param('thread_id') threadId: string,
    @Body() body: { values: Record<string, any>; as_node?: string },
  ) {
    return this.agentService.updateState(threadId, body.values, body.as_node);
  }

  @Post('threads/:thread_id/runs/stream')
  async streamRun(
    @Param('thread_id') threadId: string,
    @Body()
    body: {
      input?: Record<string, any> | null;
      command?: { resume: any };
      assistant_id?: string;
      stream_mode?: string[];
    },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let eventId = 0;

    try {
      for await (const event of this.agentService.streamRun(threadId, body)) {
        res.write(`id: ${eventId}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
        eventId++;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(`id: ${eventId}\nevent: error\ndata: ${JSON.stringify({ message })}\n\n`);
    }
    res.end();
  }

  @Post('threads/:thread_id/history')
  @HttpCode(200)
  async getHistory(
    @Param('thread_id') threadId: string,
    @Body() body: { limit?: number },
  ) {
    return this.agentService.getHistory(threadId, body.limit);
  }
}
