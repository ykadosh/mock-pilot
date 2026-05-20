import { ipcMain } from "electron";
import fs from "fs";
import { getToken, getCopilotToken } from "../auth";
import { appSettingsPath } from "../projects";

const AI_SYSTEM_PROMPT = `You are an expert front-end developer. The user has selected an HTML element and wants to modify it.
You will receive the element's current HTML and computed CSS styles.
Based on the user's instructions, return ONLY the modified HTML for that element.

Rules:
- Return only the modified outerHTML of the element, nothing else.
- Do not wrap in markdown code blocks or add any explanation.
- Preserve the overall structure but apply the requested changes.
- You may modify inline styles, classes, attributes, text content, or child elements.
- If adding styles, use inline styles (style attribute) since you don't have access to a stylesheet.
- Keep the same tag type unless the user explicitly asks to change it.
- IMPORTANT: Preserve any data-mp-id attribute exactly as-is. Do not remove or modify it.
- If the user asks to remove/delete the element, return exactly the text: __REMOVE_ELEMENT__`;
const PREMIUM_MODELS = ["claude-sonnet-4.5", "claude-sonnet-4.6", "claude-opus-4.5", "claude-opus-4.6", "claude-opus-4.7", "claude-haiku-4.5", "gpt-4.1", "gpt-4.1-mini", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5-mini"];

type ModifyElementRequest = { prompt: string; outerHTML: string; computedStyle: Record<string, string> };
type ChatResponse = { choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }> };

function buildUserMessage(data: ModifyElementRequest) {
  const styles = Object.entries(data.computedStyle).map(([key, value]) => `${key}: ${value}`).join("\n");
  return `Here is the selected element's HTML:\n\`\`\`html\n${data.outerHTML}\n\`\`\`\n\nHere are its current computed styles:\n${styles}\n\nUser's requested modification: ${data.prompt}\n\nReturn only the modified HTML element:`;
}

function getSelectedAiModel() {
  try {
    if (!fs.existsSync(appSettingsPath)) return "gpt-4o";
    const settings = JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
    return settings.aiModel || "gpt-4o";
  } catch {
    return "gpt-4o";
  }
}

async function getAiApiToken(aiModel: string, token: string) {
  if (!PREMIUM_MODELS.includes(aiModel)) return token;
  const copilotToken = await getCopilotToken();
  if (copilotToken) return copilotToken;
  throw new Error(`Model "${aiModel}" requires GitHub Copilot Pro/Business. Make sure your GitHub account has Copilot access, or select a Free model in Settings.`);
}

function extractResponseContent(result: ChatResponse) {
  const choice = result.choices?.[0];
  return choice?.message?.content ?? choice?.delta?.content ?? "";
}

function normalizeModifiedHtml(result: ChatResponse) {
  const modifiedHTML = extractResponseContent(result).trim().replace(/^```(?:html)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return modifiedHTML || "__REMOVE_ELEMENT__";
}

async function requestModifiedHtml(aiModel: string, apiToken: string, userMessage: string) {
  const response = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json", "Copilot-Integration-Id": "copilot-4-cli" },
    body: JSON.stringify({ model: aiModel, messages: [{ role: "system", content: AI_SYSTEM_PROMPT }, { role: "user", content: userMessage }], temperature: 0.3 }),
  });
  if (!response.ok) throw new Error(`API error (${response.status}): ${await response.text()}`);
  return normalizeModifiedHtml(await response.json() as ChatResponse);
}

async function handleAiModifyElement(_event: Electron.IpcMainInvokeEvent, data: ModifyElementRequest) {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
    const aiModel = getSelectedAiModel();
    const apiToken = await getAiApiToken(aiModel, token);
    const html = await requestModifiedHtml(aiModel, apiToken, buildUserMessage(data));
    return { success: true, html };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export function registerAiHandlers() {
  ipcMain.handle("ai-modify-element", handleAiModifyElement);
}
