import fs from "fs";
import { getCopilotToken } from "../auth";
import { appSettingsPath } from "../projects";

type ChatResponse = { choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }> };

const PREMIUM_MODELS = ["claude-sonnet-4.5", "claude-sonnet-4.6", "claude-opus-4.5", "claude-opus-4.6", "claude-opus-4.7", "claude-haiku-4.5", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5-mini"];

export function getSelectedAiModel() {
  try {
    if (!fs.existsSync(appSettingsPath)) return "gpt-4o";
    const settings = JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
    return settings.aiModel || "gpt-4o";
  } catch {
    return "gpt-4o";
  }
}

export async function getAiApiToken(aiModel: string, token: string) {
  if (!PREMIUM_MODELS.includes(aiModel)) return token;
  const copilotToken = await getCopilotToken();
  if (copilotToken) return copilotToken;
  throw new Error(`Model "${aiModel}" requires GitHub Copilot Pro/Business. Make sure your GitHub account has Copilot access, or select a Free model in Settings.`);
}

function extractResponseContent(result: ChatResponse) {
  const choice = result.choices?.[0];
  return choice?.message?.content ?? choice?.delta?.content ?? "";
}

let activeAbortController: AbortController | null = null;

export function abortActiveAiRequest() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
}

export async function requestChatCompletion(options: { aiModel: string; apiToken: string; systemPrompt: string; userMessage: string | object[] }) {
  activeAbortController = new AbortController();
  const { signal } = activeAbortController;
  try {
    const response = await fetch("https://api.githubcopilot.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${options.apiToken}`, "Content-Type": "application/json", "Copilot-Integration-Id": "copilot-4-cli" },
      body: JSON.stringify({ model: options.aiModel, messages: [{ role: "system", content: options.systemPrompt }, { role: "user", content: options.userMessage }], temperature: 0.2 }),
      signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error (${response.status}): ${body.slice(0, 500)}`);
    }
    const result = await response.json() as ChatResponse;
    return extractResponseContent(result).trim();
  } finally {
    activeAbortController = null;
  }
}
