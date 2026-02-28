import { Controller, Post, Get, Put, Param, Body, Res } from '@nestjs/common'
import { Response } from 'express'
import { AgentService } from './agent.service'
import { Task } from '@todos/shared'

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('thread')
  createThread() {
    const threadId = this.agentService.createThread()
    return { threadId }
  }

  @Post(':threadId/chat')
  async chat(
    @Param('threadId') threadId: string,
    @Body() body: { message: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    for await (const event of this.agentService.streamChat(threadId, body.message)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
    res.end()
  }

  @Post(':threadId/resume')
  async resume(
    @Param('threadId') threadId: string,
    @Body() body: { response: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    for await (const event of this.agentService.resumeAfterInterrupt(threadId, body.response)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
    res.end()
  }

  @Get(':threadId/state')
  async getState(@Param('threadId') threadId: string) {
    const state = await this.agentService.getState(threadId)
    return state
  }

  @Put(':threadId/state')
  async updateState(
    @Param('threadId') threadId: string,
    @Body() body: { tasks: Task[] },
  ) {
    await this.agentService.updateState(threadId, { tasks: body.tasks })
    return { success: true }
  }
}
