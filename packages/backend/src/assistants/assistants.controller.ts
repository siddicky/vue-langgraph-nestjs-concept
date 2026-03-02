import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { AssistantsService } from './assistants.service';

@Controller('assistants')
export class AssistantsController {
  constructor(private assistantsService: AssistantsService) {}

  @Post('search')
  @HttpCode(200)
  async search(
    @Body()
    body?: {
      graph_id?: string;
      metadata?: Record<string, any>;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.assistantsService.search({
      graphId: body?.graph_id,
      metadata: body?.metadata,
      limit: body?.limit,
      offset: body?.offset,
    });
  }

  @Get(':assistant_id')
  async get(@Param('assistant_id') assistantId: string) {
    return this.assistantsService.get(assistantId);
  }

  @Post()
  async create(
    @Body()
    body: {
      graph_id: string;
      config?: Record<string, any>;
      metadata?: Record<string, any>;
      assistant_id?: string;
      name?: string;
      description?: string;
    },
  ) {
    return this.assistantsService.create({
      graphId: body.graph_id,
      config: body.config,
      metadata: body.metadata,
      assistantId: body.assistant_id,
      name: body.name,
      description: body.description,
    });
  }

  @Patch(':assistant_id')
  async update(
    @Param('assistant_id') assistantId: string,
    @Body()
    body: {
      graph_id?: string;
      config?: Record<string, any>;
      metadata?: Record<string, any>;
      name?: string;
      description?: string;
    },
  ) {
    return this.assistantsService.update(assistantId, {
      graphId: body.graph_id,
      config: body.config,
      metadata: body.metadata,
      name: body.name,
      description: body.description,
    });
  }

  @Delete(':assistant_id')
  @HttpCode(204)
  async delete(@Param('assistant_id') assistantId: string) {
    await this.assistantsService.delete(assistantId);
  }

  @Get(':assistant_id/graph')
  async getGraph(
    @Param('assistant_id') assistantId: string,
    @Query('xray') xray?: string,
  ) {
    const options = xray !== undefined ? { xray: xray === 'true' || Number(xray) } : undefined;
    return this.assistantsService.getGraph(assistantId, options);
  }

  @Get(':assistant_id/schemas')
  async getSchemas(@Param('assistant_id') assistantId: string) {
    return this.assistantsService.getSchemas(assistantId);
  }
}
