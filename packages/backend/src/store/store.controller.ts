import {
  Controller,
  Put,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Put('items')
  @HttpCode(204)
  async putItem(
    @Body()
    body: {
      namespace: string[];
      key: string;
      value: Record<string, any>;
      index?: string[];
      ttl?: number;
    },
  ) {
    await this.storeService.putItem(body.namespace, body.key, body.value, {
      index: body.index,
      ttl: body.ttl,
    });
  }

  @Post('items/get')
  @HttpCode(200)
  async getItem(
    @Body() body: { namespace: string[]; key: string; refresh_ttl?: boolean },
  ) {
    return this.storeService.getItem(body.namespace, body.key, {
      refreshTtl: body.refresh_ttl,
    });
  }

  @Delete('items')
  @HttpCode(204)
  async deleteItem(
    @Body() body: { namespace: string[]; key: string },
  ) {
    await this.storeService.deleteItem(body.namespace, body.key);
  }

  @Post('items/search')
  @HttpCode(200)
  async searchItems(
    @Body()
    body: {
      namespace_prefix: string[];
      filter?: Record<string, any>;
      limit?: number;
      offset?: number;
      query?: string;
    },
  ) {
    return this.storeService.searchItems(body.namespace_prefix, {
      filter: body.filter,
      limit: body.limit,
      offset: body.offset,
      query: body.query,
    });
  }

  @Post('namespaces')
  @HttpCode(200)
  async listNamespaces(
    @Body()
    body?: {
      prefix?: string[];
      suffix?: string[];
      max_depth?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.storeService.listNamespaces({
      prefix: body?.prefix,
      suffix: body?.suffix,
      maxDepth: body?.max_depth,
      limit: body?.limit,
      offset: body?.offset,
    });
  }
}
