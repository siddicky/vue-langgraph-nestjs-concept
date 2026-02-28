import { addTaskTool, deleteTaskTool, setTaskStatusTool, allTools } from '../../src/agent/agent.tools';

describe('Agent Tools', () => {
  describe('addTaskTool', () => {
    it('should have the correct name and description', () => {
      expect(addTaskTool.name).toBe('addTask');
      expect(addTaskTool.description).toBe('Adds a task to the todo list');
    });

    it('should return JSON with tool name and args', async () => {
      const result = await addTaskTool.invoke({ title: 'Buy milk' });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        tool: 'addTask',
        args: { title: 'Buy milk' },
      });
    });
  });

  describe('deleteTaskTool', () => {
    it('should have the correct name and description', () => {
      expect(deleteTaskTool.name).toBe('deleteTask');
      expect(deleteTaskTool.description).toBe('Deletes a task from the todo list');
    });

    it('should return JSON with tool name and args', async () => {
      const result = await deleteTaskTool.invoke({ id: 3 });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        tool: 'deleteTask',
        args: { id: 3 },
      });
    });
  });

  describe('setTaskStatusTool', () => {
    it('should have the correct name and description', () => {
      expect(setTaskStatusTool.name).toBe('setTaskStatus');
      expect(setTaskStatusTool.description).toBe('Sets the status of a task');
    });

    it('should return JSON with tool name and args', async () => {
      const result = await setTaskStatusTool.invoke({ id: 1, status: 'done' });
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        tool: 'setTaskStatus',
        args: { id: 1, status: 'done' },
      });
    });
  });

  describe('allTools', () => {
    it('should export all three tools', () => {
      expect(allTools).toHaveLength(3);
      const names = allTools.map((t) => t.name);
      expect(names).toEqual(['addTask', 'deleteTask', 'setTaskStatus']);
    });
  });
});
