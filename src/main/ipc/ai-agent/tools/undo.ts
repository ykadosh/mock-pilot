import type { ToolDefinition, ToolContext } from "../agent-types";

export const undo: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "undo",
      description: "Undo the last HTML modification, restoring the document to its previous state. Can be called multiple times to undo multiple changes.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    if (!context.snapshots || context.snapshots.length === 0) {
      return "Nothing to undo. No previous states recorded.";
    }

    const previousHtml = context.snapshots.pop()!;
    context.$.root().empty();
    context.$.root().append(previousHtml);
    return `Undone last change. ${context.snapshots.length} undo state(s) remaining.`;
  },
};
