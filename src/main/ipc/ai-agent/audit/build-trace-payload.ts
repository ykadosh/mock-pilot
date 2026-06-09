import type { AgentMessage, AgentProgress } from "../agent-types";
import { clipContent, computeHtmlDiff, formatMessages, formatStats, summarizeProgress } from "./trace-formatters";

interface BuildPayloadArgs {
  prompt: string;
  aiModel: string;
  inputHtml: string;
  finalHtml: string | undefined;
  iterations: number;
  success: boolean;
  error?: string;
  maxIterationsReached?: boolean;
  totalMs: number;
  messages: AgentMessage[] | undefined;
  progressEvents: AgentProgress[];
}

const MAX_PAYLOAD_BYTES = 500 * 1024;

function buildMetadataSection(args: BuildPayloadArgs): string[] {
  return [
    "# Run metadata",
    `- prompt: ${clipContent(args.prompt, 1000)}`,
    `- model: ${args.aiModel}`,
    `- iterations: ${args.iterations}`,
    `- success: ${args.success}`,
    `- maxIterationsReached: ${Boolean(args.maxIterationsReached)}`,
    `- totalMs: ${args.totalMs}`,
    `- error: ${args.error ?? "(none)"}`,
    `- inputHtmlBytes: ${args.inputHtml.length}`,
    `- finalHtmlBytes: ${args.finalHtml?.length ?? 0}`,
  ];
}

function buildSections(args: BuildPayloadArgs, messagesText: string): string[] {
  const stats = summarizeProgress(args.progressEvents);
  const diff = computeHtmlDiff(args.inputHtml, args.finalHtml ?? args.inputHtml);
  return [
    ...buildMetadataSection(args),
    "",
    "# Run stats",
    formatStats(stats),
    "",
    "# Final HTML diff",
    "```diff", diff, "```",
    "",
    "# Full message trace",
    "```", messagesText, "```",
  ];
}

export function buildTracePayload(args: BuildPayloadArgs): string {
  const messagesText = args.messages ? formatMessages(args.messages) : "<no messages>";
  const sections = buildSections(args, messagesText);
  let payload = sections.join("\n");
  if (payload.length > MAX_PAYLOAD_BYTES) {
    const dropIdx = sections.indexOf("# Full message trace");
    const dropped = [
      ...sections.slice(0, dropIdx),
      "# Full message trace",
      `<dropped: payload exceeded ${MAX_PAYLOAD_BYTES} bytes (was ${payload.length}). Trace contained ${args.messages?.length ?? 0} messages.>`,
    ];
    payload = dropped.join("\n");
  }
  return payload;
}
