import { ipcMain } from "electron";
import { getToken } from "../auth";
import { getSelectedAiModel, getAiApiToken, requestChatCompletion } from "./ai-shared";

const AI_PAGE_SYSTEM_PROMPT = `You are an expert front-end developer. The user wants to modify an entire HTML page.
You will receive the page's current HTML.
Based on the user's instructions, return ONLY the modified full HTML document.

Rules:
- Return only the modified HTML document, nothing else.
- Do not wrap in markdown code blocks or add any explanation.
- Preserve the overall structure but apply the requested changes throughout the page.
- You may modify inline styles, classes, attributes, text content, or elements.
- If adding styles, use inline styles (style attribute) or a <style> block in the <head>.
- IMPORTANT: Preserve any data-mp-id attributes exactly as-is. Do not remove or modify them.
- Return the complete HTML document including <!DOCTYPE html> and <html> tags.`;

type ModifyPageRequest = { prompt: string; fullHTML: string; images?: { name: string; dataUrl: string }[] };

function buildPageUserMessage(data: ModifyPageRequest) {
  const content: object[] = [];
  if (data.images && data.images.length > 0) {
    for (const img of data.images) {
      content.push({ type: "image_url", image_url: { url: img.dataUrl, detail: "low" } });
    }
  }
  const html = data.fullHTML.length > 60000 ? data.fullHTML.slice(0, 60000) + "\n<!-- truncated -->" : data.fullHTML;
  content.push({ type: "text", text: `Here is the current page HTML:\n\`\`\`html\n${html}\n\`\`\`\n\nUser's requested modification: ${data.prompt}\n\nReturn the complete modified HTML document:` });
  return content;
}

async function handleAiModifyPage(_event: Electron.IpcMainInvokeEvent, data: ModifyPageRequest) {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
    const aiModel = getSelectedAiModel();
    const apiToken = await getAiApiToken(aiModel, token);
    const raw = await requestChatCompletion({
      aiModel, apiToken, systemPrompt: AI_PAGE_SYSTEM_PROMPT, userMessage: buildPageUserMessage(data),
    });
    const html = raw.replace(/^```(?:html)?\n?/i, "").replace(/\n?```$/i, "").trim();
    if (!html) return { success: false, error: "Empty response from AI" };
    return { success: true, html };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export function registerAiPageHandlers() {
  ipcMain.handle("ai-modify-page", handleAiModifyPage);
}
