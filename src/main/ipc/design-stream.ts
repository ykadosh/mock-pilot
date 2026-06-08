export const DESIGN_GEN_SYSTEM_PROMPT = `You are a senior design systems writer. Given an extracted snapshot of a website (its captured HTML and structured asset library: colors, typography, components, icons), produce a concise but thorough \`design.md\` file written in Markdown that describes the project's design language so an LLM can reliably stay on-brand when editing the page later.

Rules:
- Output ONLY the raw Markdown content of design.md — no surrounding code fences, no preamble, no commentary.
- Ground every claim in the supplied evidence. If a section can't be inferred, omit it instead of inventing it.
- Keep it focused and skimmable. Aim for ~200-500 lines max. Use short paragraphs and bullet lists.
- Cover (when supported by evidence): Overview / tone & voice, Color palette (with hex values and intended usage), Typography scale (families, sizes, weights, line-heights, what each is used for), Spacing & layout rhythm, Component patterns (shape, radius, elevation, density), Iconography style, Imagery / graphics treatment, Do's & don'ts.
- Do NOT include implementation code beyond the occasional inline example. This is a natural-language design spec, not a stylesheet.`;

interface StreamArgs {
  aiModel: string;
  apiToken: string;
  userMessage: string;
  onChunk: (accumulated: string) => void;
  signal: AbortSignal;
}

function parseDelta(data: string): string | null {
  try {
    const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

async function consumeSse(body: ReadableStream<Uint8Array>, onChunk: (accumulated: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return accumulated;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return accumulated;
      const delta = parseDelta(data);
      if (delta) { accumulated += delta; onChunk(accumulated); }
    }
  }
}

export async function streamDesignCompletion(args: StreamArgs): Promise<string> {
  const response = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${args.apiToken}`, "Content-Type": "application/json", "Copilot-Integration-Id": "copilot-4-cli" },
    body: JSON.stringify({
      model: args.aiModel,
      messages: [{ role: "system", content: DESIGN_GEN_SYSTEM_PROMPT }, { role: "user", content: args.userMessage }],
      temperature: 0.2,
      stream: true,
    }),
    signal: args.signal,
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${body.slice(0, 500)}`);
  }
  return await consumeSse(response.body, args.onChunk);
}
