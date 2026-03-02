import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from '../../src/agent/agent.module';
import { LocalAgentService } from '../../src/agent/agent.service';
import { RemoteAgentService } from '../../src/agent/remote-agent.service';
import { AGENT_SERVICE } from '../../src/agent/agent.constants';
import { ThreadModule } from '../../src/thread/thread.module';
import { LanggraphSdkModule } from '../../src/langgraph-sdk';

jest.mock('../../src/agent/agent.graph', () => ({
  buildAgentGraph: jest.fn().mockReturnValue({
    stream: jest.fn(),
    getState: jest.fn(),
    updateState: jest.fn(),
    getStateHistory: jest.fn(),
  }),
}));

jest.mock('@langchain/langgraph-sdk', () => ({
  Client: jest.fn().mockImplementation(() => ({
    threads: { create: jest.fn(), getState: jest.fn(), updateState: jest.fn(), getHistory: jest.fn() },
    runs: { stream: jest.fn() },
    assistants: {},
    crons: {},
    store: {},
  })),
}));

describe('AgentModule', () => {
  it('should provide LocalAgentService when LANGGRAPH_MODE=local', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LANGGRAPH_MODE: 'local' })],
        }),
        LanggraphSdkModule,
        ThreadModule,
        AgentModule,
      ],
    }).compile();

    const agentService = module.get(AGENT_SERVICE);
    expect(agentService).toBeInstanceOf(LocalAgentService);
  });

  it('should provide RemoteAgentService when LANGGRAPH_MODE=remote', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LANGGRAPH_MODE: 'remote' })],
        }),
        LanggraphSdkModule,
        ThreadModule,
        AgentModule,
      ],
    }).compile();

    const agentService = module.get(AGENT_SERVICE);
    expect(agentService).toBeInstanceOf(RemoteAgentService);
  });

  it('should default to LocalAgentService when LANGGRAPH_MODE is not set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        LanggraphSdkModule,
        ThreadModule,
        AgentModule,
      ],
    }).compile();

    const agentService = module.get(AGENT_SERVICE);
    expect(agentService).toBeInstanceOf(LocalAgentService);
  });
});
