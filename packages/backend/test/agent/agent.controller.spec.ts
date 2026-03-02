import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from '../../src/agent/agent.controller';
import { AGENT_SERVICE } from '../../src/agent/agent.constants';
import type { IAgentService } from '../../src/agent/agent.service.interface';

describe('AgentController', () => {
  let controller: AgentController;
  let agentService: jest.Mocked<IAgentService>;

  beforeEach(async () => {
    const mockAgentService = {
      createThread: jest.fn(),
      streamRun: jest.fn(),
      getState: jest.fn(),
      updateState: jest.fn(),
      getHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        { provide: AGENT_SERVICE, useValue: mockAgentService },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
    agentService = module.get(AGENT_SERVICE);
  });

  describe('POST /threads', () => {
    it('should return platform-compatible thread object', async () => {
      agentService.createThread.mockReturnValue('550e8400-e29b-41d4-a716-446655440000' as any);
      const result = await controller.createThread();
      expect(result.thread_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.status).toBe('idle');
      expect(result.metadata).toEqual({});
      expect(result.values).toEqual({});
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
    });
  });

  describe('GET /threads/:thread_id/state', () => {
    it('should return ThreadState from agentService', async () => {
      const mockState = {
        values: { messages: [], tasks: [], pendingActions: [] },
        next: [],
        checkpoint: { thread_id: 'tid', checkpoint_id: 'cid', checkpoint_ns: '' },
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
        parent_checkpoint: null,
        tasks: [],
      };
      agentService.getState.mockResolvedValue(mockState);

      const result = await controller.getState('tid');
      expect(result).toEqual(mockState);
      expect(agentService.getState).toHaveBeenCalledWith('tid');
    });
  });

  describe('POST /threads/:thread_id/state', () => {
    it('should call updateState with values and return checkpoint info', async () => {
      const checkpoint = {
        configurable: {
          thread_id: 'tid',
          checkpoint_id: 'cid-123',
          checkpoint_ns: '',
        },
      };
      agentService.updateState.mockResolvedValue(checkpoint);

      const result = await controller.updateState('tid', {
        values: { tasks: [{ id: 1, title: 'Test', status: 'todo' }] },
      });

      expect(result).toEqual(checkpoint);
      expect(agentService.updateState).toHaveBeenCalledWith(
        'tid',
        { tasks: [{ id: 1, title: 'Test', status: 'todo' }] },
        undefined,
      );
    });
  });

  describe('POST /threads/:thread_id/runs/stream', () => {
    it('should stream SSE events with event:/data:/id: format', async () => {
      const mockEvents = [
        { event: 'metadata', data: { run_id: 'run-1', attempt: 1 } },
        { event: 'values', data: { messages: [], tasks: [] } },
      ];

      async function* mockStreamRun() {
        for (const event of mockEvents) {
          yield event;
        }
      }

      agentService.streamRun.mockReturnValue(mockStreamRun() as any);

      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => written.push(data)),
        end: jest.fn(),
      } as any;

      await controller.streamRun(
        'tid',
        { input: { messages: [{ type: 'human', content: 'hello' }] }, assistant_id: 'agent' },
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(written).toHaveLength(2);
      expect(written[0]).toContain('id: 0');
      expect(written[0]).toContain('event: metadata');
      expect(written[0]).toContain('"run_id"');
      expect(written[1]).toContain('id: 1');
      expect(written[1]).toContain('event: values');
      expect(res.end).toHaveBeenCalled();
    });

    it('should write error event when streamRun throws', async () => {
      async function* mockStreamRun(): AsyncGenerator<any> {
        throw new Error('LLM failed');
      }

      agentService.streamRun.mockReturnValue(mockStreamRun() as any);

      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => written.push(data)),
        end: jest.fn(),
      } as any;

      await controller.streamRun('tid', { input: null }, res);

      expect(written).toHaveLength(1);
      expect(written[0]).toContain('event: error');
      expect(written[0]).toContain('LLM failed');
      expect(res.end).toHaveBeenCalled();
    });

    it('should pass command for resume flow', async () => {
      async function* mockStreamRun() {
        yield { event: 'metadata', data: { run_id: 'run-2', attempt: 1 } };
        yield { event: 'values', data: { messages: [], tasks: [] } };
      }

      agentService.streamRun.mockReturnValue(mockStreamRun() as any);

      const res = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await controller.streamRun(
        'tid',
        { command: { resume: 'approve' }, assistant_id: 'agent' },
        res,
      );

      expect(agentService.streamRun).toHaveBeenCalledWith('tid', {
        command: { resume: 'approve' },
        assistant_id: 'agent',
      });
    });
  });

  describe('POST /threads/:thread_id/history', () => {
    it('should return state history array', async () => {
      const mockHistory = [
        {
          values: { messages: [], tasks: [] },
          next: [],
          checkpoint: { thread_id: 'tid', checkpoint_id: 'c2', checkpoint_ns: '' },
          metadata: {},
          created_at: '2026-01-01T00:00:01.000Z',
          parent_checkpoint: { thread_id: 'tid', checkpoint_id: 'c1', checkpoint_ns: '' },
          tasks: [],
        },
        {
          values: { messages: [], tasks: [] },
          next: [],
          checkpoint: { thread_id: 'tid', checkpoint_id: 'c1', checkpoint_ns: '' },
          metadata: {},
          created_at: '2026-01-01T00:00:00.000Z',
          parent_checkpoint: null,
          tasks: [],
        },
      ];
      agentService.getHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory('tid', { limit: 10 });
      expect(result).toEqual(mockHistory);
      expect(agentService.getHistory).toHaveBeenCalledWith('tid', 10);
    });
  });
});
