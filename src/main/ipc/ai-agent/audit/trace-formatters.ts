import type { AgentMessage, AgentProgress, ToolCall } from "../agent-types";

const MAX_TOOL_CONTENT_CHARS = 2000;
const MAX_DIFF_CHARS = 2000;

export function clipContent(text: string, maxChars = MAX_TOOL_CONTENT_CHARS): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated ${text.length - maxChars} chars]`;
}

export function redactImageDataUrls(text: string): string {
  return text.replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]{100,}/g, (m) => `<image redacted ${m.length} bytes>`);
}

function formatContentPart(part: unknown): string {
  if (!part || typeof part !== "object") return String(part);
  const p = part as { type?: string; text?: string };
  if (p.type === "text") return clipContent(redactImageDataUrls(p.text ?? ""));
  if (p.type === "image_url") return `<image part>`;
  return `<${p.type ?? "unknown"} part>`;
}

function formatContent(content: AgentMessage["content"]): string {
  if (content == null) return "";
  if (typeof content === "string") return clipContent(redactImageDataUrls(content));
  if (Array.isArray(content)) return content.map(formatContentPart).join("\n");
  return "";
}

function formatToolCalls(calls: ToolCall[] | undefined): string {
  if (!calls || calls.length === 0) return "";
  return calls.map((c) => `  → ${c.function.name}(${clipContent(c.function.arguments, 800)})`).join("\n");
}

export function formatMessages(messages: AgentMessage[]): string {
  return messages
    .map((m, i) => {
      const tag = m.role === "tool" ? `tool[${m.tool_call_id ?? "?"}]` : m.role;
      const body = formatContent(m.content);
      const calls = formatToolCalls(m.tool_calls);
      const lines = [`[${i}] ${tag}: ${body}`];
      if (calls) lines.push(calls);
      return lines.join("\n");
    })
    .join("\n");
}

export interface ProgressStats {
  toolCounts: Map<string, number>;
  phaseTransitions: { iter: number; phase: string }[];
  errors: { iter: number; toolName?: string; error: string }[];
  nudges: number;
}

function recordIteration(state: { iter: number; toolsThisIter: number; nudges: number }, next: number): void {
  if (state.iter > 0 && state.toolsThisIter === 0) state.nudges++;
  state.iter = next || state.iter;
  state.toolsThisIter = 0;
}

function applyEvent(stats: ProgressStats, state: { iter: number; toolsThisIter: number; nudges: number }, ev: AgentProgress): void {
  if (ev.type === "iteration") { recordIteration(state, ev.iteration ?? 0); return; }
  if (ev.type === "tool_start" && ev.toolName) {
    stats.toolCounts.set(ev.toolName, (stats.toolCounts.get(ev.toolName) ?? 0) + 1);
    state.toolsThisIter++;
    return;
  }
  if (ev.type === "phase" && ev.phase) { stats.phaseTransitions.push({ iter: state.iter, phase: ev.phase }); return; }
  if (ev.type === "error") stats.errors.push({ iter: state.iter, toolName: ev.toolName, error: ev.error ?? "<no message>" });
}

export function summarizeProgress(events: AgentProgress[]): ProgressStats {
  const stats: ProgressStats = { toolCounts: new Map(), phaseTransitions: [], errors: [], nudges: 0 };
  const state = { iter: 0, toolsThisIter: 0, nudges: 0 };
  for (const ev of events) applyEvent(stats, state, ev);
  if (state.iter > 0 && state.toolsThisIter === 0) state.nudges++;
  stats.nudges = state.nudges;
  return stats;
}

export function formatStats(stats: ProgressStats): string {
  const toolLines = Array.from(stats.toolCounts.entries()).sort((a, b) => b[1] - a[1]).map(([n, c]) => `  ${n}: ${c}`).join("\n");
  const phaseLines = stats.phaseTransitions.map((t) => `  iter ${t.iter} → ${t.phase}`).join("\n");
  const errorLines = stats.errors.map((e) => `  iter ${e.iter} ${e.toolName ?? "?"}: ${e.error}`).join("\n");
  return [
    `Tool call counts:\n${toolLines || "  (none)"}`,
    `Phase transitions:\n${phaseLines || "  (none)"}`,
    `Errors:\n${errorLines || "  (none)"}`,
    `Nudges (iterations with no tool call): ${stats.nudges}`,
  ].join("\n\n");
}

export function computeHtmlDiff(before: string, after: string): string {
  if (before === after) return "(no changes — input HTML unchanged)";
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const lines: string[] = [
    `--- input.html (${before.length} chars, ${beforeLines.length} lines)`,
    `+++ final.html (${after.length} chars, ${afterLines.length} lines)`,
  ];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    const a = beforeLines[i];
    const b = afterLines[i];
    if (a === b) continue;
    if (a !== undefined) lines.push(`- ${a}`);
    if (b !== undefined) lines.push(`+ ${b}`);
  }
  const diff = lines.join("\n");
  return diff.length > MAX_DIFF_CHARS
    ? `${diff.slice(0, MAX_DIFF_CHARS)}\n…[diff truncated ${diff.length - MAX_DIFF_CHARS} chars]`
    : diff;
}
