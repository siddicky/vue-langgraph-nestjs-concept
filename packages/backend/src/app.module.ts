import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LanggraphSdkModule } from './langgraph-sdk';
import { ThreadModule } from './thread/thread.module';
import { AgentModule } from './agent/agent.module';
import { AssistantsModule } from './assistants/assistants.module';
import { CronsModule } from './crons/crons.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LanggraphSdkModule,
    ThreadModule,
    AgentModule,
    AssistantsModule,
    CronsModule,
    StoreModule,
  ],
})
export class AppModule {}
