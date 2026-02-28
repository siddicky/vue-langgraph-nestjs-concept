import { Module } from '@nestjs/common'
import { AgentModule } from './agent/agent.module'
import { ThreadModule } from './thread/thread.module'

@Module({
  imports: [AgentModule, ThreadModule],
})
export class AppModule {}
