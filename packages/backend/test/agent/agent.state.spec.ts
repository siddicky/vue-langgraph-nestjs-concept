import { AgentStateAnnotation } from '../../src/agent/agent.state';

describe('AgentStateAnnotation', () => {
  it('should define the messages channel', () => {
    const spec = AgentStateAnnotation.spec;
    expect(spec).toHaveProperty('messages');
  });

  it('should define the tasks channel', () => {
    const spec = AgentStateAnnotation.spec;
    expect(spec).toHaveProperty('tasks');
  });

  it('should define the pendingActions channel', () => {
    const spec = AgentStateAnnotation.spec;
    expect(spec).toHaveProperty('pendingActions');
  });

  it('should have all three channels and no extras', () => {
    const spec = AgentStateAnnotation.spec;
    const keys = Object.keys(spec);
    expect(keys).toContain('messages');
    expect(keys).toContain('tasks');
    expect(keys).toContain('pendingActions');
    expect(keys).toHaveLength(3);
  });

  it('should have a spec that can be used to construct a StateGraph', () => {
    // Verify the annotation root is usable (has the right shape)
    expect(AgentStateAnnotation).toBeDefined();
    expect(AgentStateAnnotation.spec).toBeDefined();
  });
});
