import type { ToolDefinition } from "../agent-types";

export const finish: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "finish",
      description: "Call this tool when you have completed all modifications. Provide a brief summary of what was changed. This is the ONLY way to signal that you are done.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "A brief summary of all modifications made to the page" },
        },
        required: ["summary"],
      },
    },
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const summary = args.summary as string;
    return `__FINISH__:${summary}`;
  },
};
