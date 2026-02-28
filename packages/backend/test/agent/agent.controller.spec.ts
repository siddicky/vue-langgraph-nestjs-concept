import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from '../../src/agent/agent.controller';
import { AgentService } from '../../src/agent/agent.service';

describe('AgentController', () => {
  let controller: AgentController;
  let agentService: jest.Mocked<AgentService>;

  beforeEach(async () => {
    const mockAgentService = {
      createThread: jest.fn(),
      streamChat: jest.fn(),
      resumeAfterInterrupt: jest.fn(),
      getState: jest.fn(),
      updateState: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        { provide: AgentService, useValue: mockAgentService },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
    agentService = module.get(AgentService);
  });

  describe('createThread', () => {
    it('should return a threadId', () => {
      agentService.createThread.mockReturnValue('thread_123');
      const result = controller.createThread();
      expect(result).toEqual({ threadId: 'thread_123' });
    });
  });

  describe('chat', () => {
    it('should stream SSE events from agentService.streamChat', async () => {
      const mockEvents = [
        { type: 'message_chunk', data: { role: 'assistant', content: 'Hi' } },
        { type: 'done', data: null },
      ];

      async function* mockStreamChat() {
        for (const event of mockEvents) {
          yield event;
        }
      }

      agentService.streamChat.mockReturnValue(mockStreamChat() as any);

      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => written.push(data)),
        end: jest.fn(),
      } as any;

      await controller.chat('thread_123', 'hello', res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(written).toHaveLength(2);
      expect(written[0]).toContain('"type":"message_chunk"');
      expect(written[1]).toContain('"type":"done"');
      expect(res.end).toHaveBeenCalled();
    });

    it('should write error event when streamChat throws', async () => {
      async function* mockStreamChat(): AsyncGenerator<any> {
        throw new Error('LLM failed');
      }

      agentService.streamChat.mockReturnValue(mockStreamChat() as any);

      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => written.push(data)),
        end: jest.fn(),
      } as any;

      await controller.chat('thread_123', 'hello', res);

      expect(written).toHaveLength(1);
      expect(written[0]).toContain('"type":"error"');
      expect(written[0]).toContain('LLM failed');
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should stream SSE events from resumeAfterInterrupt', async () => {
      const mockEvents = [
        { type: 'state_update', data: { tasks: [] } },
        { type: 'message_chunk', data: { role: 'assistant', content: 'Done' } },
        { type: 'done', data: null },
      ];

      async function* mockResume() {
        for (const event of mockEvents) {
          yield event;
        }
      }

      agentService.resumeAfterInterrupt.mockReturnValue(mockResume() as any);

      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => written.push(data)),
        end: jest.fn(),
      } as any;

      await controller.resume('thread_123', 'approve', res);

      expect(written).toHaveLength(3);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return state from agentService', async () => {
      const mockState = { messages: [], tasks: [], pendingAction: null };
      agentService.getState.mockResolvedValue(mockState);

      const result = await controller.getState('thread_123');
      expect(result).toEqual(mockState);
      expect(agentService.getState).toHaveBeenCalledWith('thread_123');
    });
  });

  describe('updateState', () => {
    it('should call agentService.updateState with tasks', async () => {
      const tasks = [{ id: 1, title: 'Test', status: 'todo' as any }];
      const updatedState = { messages: [], tasks, pendingAction: null };
      agentService.updateState.mockResolvedValue(updatedState);

      const result = await controller.updateState('thread_123', { tasks });
      expect(result).toEqual(updatedState);
      expect(agentService.updateState).toHaveBeenCalledWith('thread_123', { tasks });
    });
  });
});
