import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentController } from './agent.controller';
import { LocalAgentService } from './agent.service';
import { RemoteAgentService } from './remote-agent.service';
import { AGENT_SERVICE } from './agent.constants';

@Module({
  controllers: [AgentController],
  providers: [
    LocalAgentService,
    RemoteAgentService,
    {
      provide: AGENT_SERVICE,
      useFactory: (
        config: ConfigService,
        local: LocalAgentService,
        remote: RemoteAgentService,
      ) => {
        const mode = config.get<string>('LANGGRAPH_MODE', 'local');
        return mode === 'remote' ? remote : local;
      },
      inject: [ConfigService, LocalAgentService, RemoteAgentService],
    },
  ],
})
export class AgentModule {}
