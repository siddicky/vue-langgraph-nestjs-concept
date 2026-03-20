import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent/agent.module';
import { PromptGeneratorModule } from './prompt-generator/prompt-generator.module';
import { ThreadModule } from './thread/thread.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThreadModule,
    AgentModule,
    PromptGeneratorModule,
  ],
})
export class AppModule {}
