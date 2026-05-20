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
const PREMIUM_MODELS = ["claude-sonnet-4.5", "claude-sonnet-4.6", "claude-opus-4.5", "claude-opus-4.6", "claude-opus-4.7", "claude-haiku-4.5", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5-mini"];

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

async function requestChatCompletion(options: { aiModel: string; apiToken: string; systemPrompt: string; userMessage: string | object[] }) {
  const userContent = options.userMessage;
  const response = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${options.apiToken}`, "Content-Type": "application/json", "Copilot-Integration-Id": "copilot-4-cli" },
    body: JSON.stringify({ model: options.aiModel, messages: [{ role: "system", content: options.systemPrompt }, { role: "user", content: userContent }], temperature: 0.2 }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error (${response.status}): ${body.slice(0, 500)}`);
  }
  const result = await response.json() as ChatResponse;
  return extractResponseContent(result).trim();
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

const COMPONENT_EXTRACTION_SYSTEM_PROMPT = `You are a UI component analyst. Given a simplified HTML structure (and optionally a screenshot) of a webpage, identify the reusable UI components present.
For each component you identify:
- It must appear at least 2 times on the page
- It should be a meaningful, self-contained UI element (button, card, list item, form field, badge, tag, nav link, etc.)
- Do NOT include: page-level layout sections, plain text nodes, or simple wrapper divs
Return a JSON array with this structure:
[{ "name": "Product Card", "selector": ".product-card", "count": 6, "description": "A card showing product image, title, price, and CTA button", "props": [{ "name": "image", "type": "image", "description": "Product image URL" }, { "name": "title", "type": "text", "description": "Product name" }] }]
Rules:
- Return ONLY valid JSON, no markdown code fences or explanation
- Use CSS selectors that would match all instances of the component
- Name components with clear, human-readable names (e.g. "Navigation Link", "Feature Card")
- Props represent the variable parts of the component (text that changes between instances, images, links, etc.)
- Prop types: "text" | "image" | "link" | "icon" | "number" | "boolean"
- Order by importance/visibility (most prominent first)
- Maximum 20 components`;

type ComponentProp = { name: string; type: string; description: string };
type AiComponent = { name: string; selector: string; count: number; description: string; props: ComponentProp[] };

function parseComponentsResponse(raw: string): AiComponent[] {
  // Strip any markdown code fences the AI might add despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const obj = item as Record<string, unknown>;
    return typeof obj.name === "string" && typeof obj.selector === "string";
  }).map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return {
      name: String(obj.name),
      selector: String(obj.selector),
      count: typeof obj.count === "number" ? obj.count : 0,
      description: typeof obj.description === "string" ? obj.description : "",
      props: Array.isArray(obj.props) ? (obj.props as ComponentProp[]) : [],
    };
  });
}

async function handleAiExtractComponents(_event: Electron.IpcMainInvokeEvent, data: { simplifiedHtml: string; screenshot?: string }) {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
    const aiModel = getSelectedAiModel();
    const apiToken = await getAiApiToken(aiModel, token);

    // Truncate HTML to stay within token budget (~30K chars ≈ 8K tokens)
    const html = data.simplifiedHtml.length > 30000 ? data.simplifiedHtml.slice(0, 30000) + "\n<!-- truncated -->" : data.simplifiedHtml;

    const userContent: object[] = [];
    if (data.screenshot) {
      userContent.push({ type: "image_url", image_url: { url: data.screenshot, detail: "low" } });
    }
    userContent.push({ type: "text", text: `Here is the simplified HTML structure of the webpage:\n\n${html}\n\nIdentify the reusable UI components:` });

    const raw = await requestChatCompletion({ aiModel, apiToken, systemPrompt: COMPONENT_EXTRACTION_SYSTEM_PROMPT, userMessage: userContent });
    const components = parseComponentsResponse(raw);
    return { success: true, components };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export function registerAiHandlers() {
  ipcMain.handle("ai-modify-element", handleAiModifyElement);
  ipcMain.handle("ai-extract-components", handleAiExtractComponents);
}
