import { ipcMain } from "electron";
import fs from "fs";

import { getToken, getCopilotToken } from "./auth";
import { appSettingsPath } from "./projects";

export function registerAiHandlers() {
  ipcMain.handle("ai-modify-element", async (_event, data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) => {
    try {
      const token = getToken();
      if (!token) {
        return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
      }

      const systemPrompt = `You are an expert front-end developer. The user has selected an HTML element and wants to modify it.
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

      const userMessage = `Here is the selected element's HTML:
\`\`\`html
${data.outerHTML}
\`\`\`

Here are its current computed styles:
${Object.entries(data.computedStyle).map(([k, v]) => `${k}: ${v}`).join("\n")}

User's requested modification: ${data.prompt}

Return only the modified HTML element:`;

      // Load selected model from settings
      let aiModel = "gpt-4o";
      try {
        if (fs.existsSync(appSettingsPath)) {
          const settings = JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
          if (settings.aiModel) aiModel = settings.aiModel;
        }
      } catch { /* use default */ }

      // Models that require gh CLI token (need full Copilot Pro/Business subscription)
      const premiumModels = ["claude-sonnet-4.5", "claude-sonnet-4.6", "claude-opus-4.5", "claude-opus-4.6", "claude-opus-4.7", "claude-haiku-4.5", "gpt-4.1", "gpt-4.1-mini", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5-mini"];
      const isPremiumModel = premiumModels.includes(aiModel);

      // For premium models, we need the gh CLI token which has full Copilot access
      let apiToken = token;
      if (isPremiumModel) {
        const copilotToken = await getCopilotToken();
        if (!copilotToken) {
          return { success: false, error: `Model "${aiModel}" requires GitHub Copilot Pro/Business. Make sure your GitHub account has Copilot access, or select a Free model in Settings.` };
        }
        apiToken = copilotToken;
      }

      // All models use the Copilot API with copilot-4-cli integration
      const response = await fetch("https://api.githubcopilot.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Copilot-Integration-Id": "copilot-4-cli",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API error (${response.status}): ${errorText}` };
      }

      const result = await response.json();
      let modifiedHTML = result.choices?.[0]?.message?.content?.trim() || "";

      // Strip markdown code blocks if present
      modifiedHTML = modifiedHTML.replace(/^```(?:html)?\n?/i, "").replace(/\n?```$/i, "").trim();

      // Handle element removal
      if (modifiedHTML === "__REMOVE_ELEMENT__" || modifiedHTML === "") {
        return { success: true, html: "__REMOVE_ELEMENT__" };
      }

      return { success: true, html: modifiedHTML };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });
}
