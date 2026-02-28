import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AgentService } from './agent.service';
import type { Task } from '@todos/shared';

@Controller('agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post('thread')
  createThread() {
    return { threadId: this.agentService.createThread() };
  }

  @Post(':threadId/chat')
  async chat(
    @Param('threadId') threadId: string,
    @Body('message') message: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.agentService.streamChat(
        threadId,
        message,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(
        `data: ${JSON.stringify({ type: 'error', data: { message } })}\n\n`,
      );
    }
    res.end();
  }

  @Post(':threadId/resume')
  async resume(
    @Param('threadId') threadId: string,
    @Body('response') userResponse: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.agentService.resumeAfterInterrupt(
        threadId,
        userResponse,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      res.write(
        `data: ${JSON.stringify({ type: 'error', data: { message } })}\n\n`,
      );
    }
    res.end();
  }

  @Get(':threadId/state')
  async getState(@Param('threadId') threadId: string) {
    return this.agentService.getState(threadId);
  }

  @Put(':threadId/state')
  async updateState(
    @Param('threadId') threadId: string,
    @Body() body: { tasks: Task[] },
  ) {
    return this.agentService.updateState(threadId, body);
  }
}
