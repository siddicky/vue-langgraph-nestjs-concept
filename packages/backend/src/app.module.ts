import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent/agent.module';
import { ThreadModule } from './thread/thread.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThreadModule,
    AgentModule,
  ],
})
export class AppModule {}
