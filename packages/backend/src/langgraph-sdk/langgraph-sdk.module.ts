import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from './langgraph-sdk.constants';

@Global()
@Module({
  providers: [
    {
      provide: LANGGRAPH_CLIENT,
      useFactory: (config: ConfigService) => {
        const apiUrl = config.get<string>(
          'LANGGRAPH_API_URL',
          'http://localhost:8123',
        );
        const apiKey = config.get<string>('LANGGRAPH_API_KEY');
        return new Client({
          apiUrl,
          ...(apiKey ? { apiKey } : {}),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [LANGGRAPH_CLIENT],
})
export class LanggraphSdkModule {}
