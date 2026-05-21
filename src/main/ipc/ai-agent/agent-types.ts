import type { CheerioAPI } from "cheerio";

export interface ToolContext {
  /** Cheerio instance loaded with the current HTML document */
  $: CheerioAPI;
  /** Returns the current full HTML from the cheerio instance */
  getHtml: () => string;
  /** Project assets (fonts, components, icons, colors) */
  projectAssets?: ProjectAssets;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface ProjectAssets {
  typography?: { family: string; variants?: string[] }[];
  colors?: { name: string; value: string }[];
  components?: { name: string; selector: string; description?: string; props?: { name: string; type: string }[] }[];
  icons?: { libraries: string[] };
  fontFaceCss?: string;
}

export interface ToolDefinition {
  schema: ToolSchema;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | object[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentProgress {
  type: "tool_start" | "tool_end" | "iteration" | "complete" | "error" | "thinking";
  toolName?: string;
  iteration?: number;
  maxIterations?: number;
  result?: string;
  error?: string;
  content?: string;
}
