import type { ToolDefinition, ToolContext } from "../agent-types";

export const finish: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "finish",
      description: "Call this tool when you have completed all modifications AND verified each plan item with verifyPlanItem. This is the ONLY way to signal that you are done. Will be rejected if any plan items remain unverified.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "A brief summary of all modifications made to the page" },
        },
        required: ["summary"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const summary = args.summary as string;

    const singleShot = context.singleShot?.value === true;
    const plan = context.getPlan?.() ?? [];
    const unverified = context.getUnverifiedItems?.() ?? [];
    if (!singleShot && plan.length > 0 && unverified.length > 0) {
      const list = unverified.map((i) => `  ${i}. [${plan[i].target}] ${plan[i].action}`).join("\n");
      return `Cannot finish yet — ${unverified.length} plan item(s) still unverified:\n${list}\n\nCall \`verifyPlanItem\` for each one (with status='ok' or 'wrong') based on the actual screenshot/inspected state. Do NOT skip verification — past runs have produced incorrect results when this step was rushed.`;
    }

    return `__FINISH__:${summary}`;
  },
};
