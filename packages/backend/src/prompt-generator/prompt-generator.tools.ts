/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const promptInstructionsSchema = z.object({
  objective: z.string().describe('The objective of the prompt'),
  variables: z.array(z.string()).describe('Variables that will be passed into the prompt template'),
  constraints: z.array(z.string()).describe('Constraints for what the output should NOT do'),
  requirements: z.array(z.string()).describe('Requirements that the output MUST adhere to'),
});

export const promptInstructionsTool = new DynamicStructuredTool({
  name: 'PromptInstructions',
  description:
    'Use this tool when you have collected all required information from the user: objective, variables, constraints, and requirements. Do not call this tool until you have all four pieces of information.',
  schema: promptInstructionsSchema as any,
  func: async (input: any) => {
    return JSON.stringify({
      tool: 'PromptInstructions',
      args: {
        objective: input.objective,
        variables: input.variables,
        constraints: input.constraints,
        requirements: input.requirements,
      },
    });
  },
});

export const promptGeneratorTools = [promptInstructionsTool];
