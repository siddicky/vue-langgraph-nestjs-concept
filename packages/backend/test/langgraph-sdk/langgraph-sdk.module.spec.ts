import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LanggraphSdkModule, LANGGRAPH_CLIENT } from '../../src/langgraph-sdk';

jest.mock('@langchain/langgraph-sdk', () => ({
  Client: jest.fn().mockImplementation((config: any) => ({
    _config: config,
    threads: {},
    runs: {},
    assistants: {},
    crons: {},
    store: {},
  })),
}));

describe('LanggraphSdkModule', () => {
  it('should provide Client with default apiUrl', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        LanggraphSdkModule,
      ],
    }).compile();

    const client = module.get(LANGGRAPH_CLIENT);
    expect(client).toBeDefined();
    expect(client._config.apiUrl).toBe('http://localhost:8123');
  });

  it('should use LANGGRAPH_API_URL env var when set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LANGGRAPH_API_URL: 'https://my-deployment.example.com' })],
        }),
        LanggraphSdkModule,
      ],
    }).compile();

    const client = module.get(LANGGRAPH_CLIENT);
    expect(client._config.apiUrl).toBe('https://my-deployment.example.com');
  });

  it('should include apiKey when LANGGRAPH_API_KEY is set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LANGGRAPH_API_KEY: 'test-api-key-123' })],
        }),
        LanggraphSdkModule,
      ],
    }).compile();

    const client = module.get(LANGGRAPH_CLIENT);
    expect(client._config.apiKey).toBe('test-api-key-123');
  });

  it('should omit apiKey when LANGGRAPH_API_KEY is not set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        LanggraphSdkModule,
      ],
    }).compile();

    const client = module.get(LANGGRAPH_CLIENT);
    expect(client._config.apiKey).toBeUndefined();
  });
});
