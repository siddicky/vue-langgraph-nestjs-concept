import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { CronsService } from './crons.service';

@Controller('crons')
export class CronsController {
  constructor(private cronsService: CronsService) {}

  @Post()
  async create(
    @Body()
    body: {
      assistant_id: string;
      schedule: string;
      input?: Record<string, any>;
      metadata?: Record<string, any>;
      config?: Record<string, any>;
    },
  ) {
    return this.cronsService.create(body.assistant_id, {
      schedule: body.schedule,
      input: body.input,
      metadata: body.metadata,
      config: body.config,
    });
  }

  @Post('threads/:thread_id')
  async createForThread(
    @Param('thread_id') threadId: string,
    @Body()
    body: {
      assistant_id: string;
      schedule: string;
      input?: Record<string, any>;
      metadata?: Record<string, any>;
      config?: Record<string, any>;
    },
  ) {
    return this.cronsService.createForThread(threadId, body.assistant_id, {
      schedule: body.schedule,
      input: body.input,
      metadata: body.metadata,
      config: body.config,
    });
  }

  @Post('search')
  @HttpCode(200)
  async search(
    @Body()
    body?: {
      assistant_id?: string;
      thread_id?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.cronsService.search({
      assistantId: body?.assistant_id,
      threadId: body?.thread_id,
      limit: body?.limit,
      offset: body?.offset,
    });
  }

  @Delete(':cron_id')
  @HttpCode(204)
  async delete(@Param('cron_id') cronId: string) {
    await this.cronsService.delete(cronId);
  }
}
