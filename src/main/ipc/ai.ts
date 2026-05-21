import { ipcMain } from "electron";
import { getToken } from "../auth";
import { getSelectedAiModel, getAiApiToken, requestChatCompletion, abortActiveAiRequest } from "./ai-shared";
import { registerAiPageHandlers } from "./ai-page";

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

type ModifyElementRequest = { prompt: string; outerHTML: string; computedStyle: Record<string, string> };

function buildUserMessage(data: ModifyElementRequest) {
  const styles = Object.entries(data.computedStyle).map(([key, value]) => `${key}: ${value}`).join("\n");
  return `Here is the selected element's HTML:\n\`\`\`html\n${data.outerHTML}\n\`\`\`\n\nHere are its current computed styles:\n${styles}\n\nUser's requested modification: ${data.prompt}\n\nReturn only the modified HTML element:`;
}

async function handleAiModifyElement(_event: Electron.IpcMainInvokeEvent, data: ModifyElementRequest) {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
    const aiModel = getSelectedAiModel();
    const apiToken = await getAiApiToken(aiModel, token);
    const raw = await requestChatCompletion({ aiModel, apiToken, systemPrompt: AI_SYSTEM_PROMPT, userMessage: buildUserMessage(data) });
    const html = raw.replace(/^```(?:html)?\n?/i, "").replace(/\n?```$/i, "").trim() || "__REMOVE_ELEMENT__";
    return { success: true, html };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function registerAiHandlers() {
  ipcMain.handle("ai-modify-element", handleAiModifyElement);
  ipcMain.handle("ai-extract-components", handleAiExtractComponents);
  ipcMain.handle("ai-cancel-request", () => { abortActiveAiRequest(); return { success: true }; });
  registerAiPageHandlers();
}
