import fs from "node:fs";
import path from "node:path";
import { AGENT_SYSTEM_PROMPT } from "../agent-system-prompt";
import { PHASES } from "../agent-phases";
import { getToolSchemas } from "../tools";

function safeReadFile(absPath: string): string {
  try {
    return fs.readFileSync(absPath, "utf-8");
  } catch {
    return `<could not read ${path.basename(absPath)}>`;
  }
}

/**
 * Collects the agent's own source (system prompt, tool schemas, phase rules)
 * into a single string blob handed to the auditor LLM as context.
 *
 * agent-loop.ts is read directly off disk relative to process.cwd(); audit mode
 * is dev-only so cwd is the repo root. If the file is missing we just skip it.
 */
export function collectAgentSource(): string {
  const toolSchemasJson = JSON.stringify(getToolSchemas(), null, 2);
  const phasesJson = JSON.stringify(PHASES, null, 2);

  const loopPath = path.join(process.cwd(), "src", "main", "ipc", "ai-agent", "agent-loop.ts");
  const loopSource = fs.existsSync(loopPath)
    ? safeReadFile(loopPath)
    : "<agent-loop.ts not available in this environment>";

  return [
    "# Agent system prompt",
    "",
    "```",
    AGENT_SYSTEM_PROMPT,
    "```",
    "",
    "# Phase rules (PHASES constant)",
    "",
    "```json",
    phasesJson,
    "```",
    "",
    "# Tool schemas (getToolSchemas())",
    "",
    "```json",
    toolSchemasJson,
    "```",
    "",
    "# agent-loop.ts source",
    "",
    "```ts",
    loopSource,
    "```",
  ].join("\n");
}
