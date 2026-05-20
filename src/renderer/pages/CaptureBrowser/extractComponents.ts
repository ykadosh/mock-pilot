import { EXTRACT_COMPONENTS_SCRIPT } from "./scripts/extractComponentsScript";
import { createMatchComponentsScript } from "./scripts/matchComponentsScript";
import type { ExtractedComponent } from "./types";

export interface ExtractComponentsResult {
  components: ExtractedComponent[];
  pageCss: string;
}

export async function extractComponents(
  webview: Electron.WebviewTag,
  log: (...args: unknown[]) => Promise<void>,
): Promise<ExtractComponentsResult> {
  try {
    const { simplifiedHtml, pageCss } = await webview.executeJavaScript(EXTRACT_COMPONENTS_SCRIPT) as { simplifiedHtml: string; pageCss: string };
    await log("Simplified HTML for AI: " + simplifiedHtml.length + " chars, CSS: " + pageCss.length + " chars");
    if (!simplifiedHtml || simplifiedHtml.length < 50) {
      await log("HTML too short for component analysis, skipping");
      return { components: [], pageCss };
    }

    const screenshot = await captureResizedScreenshot(webview);
    await log("Captured screenshot (" + Math.round(screenshot.length / 1024) + " KB)");

    const aiComponents = await callAiWithFallback(simplifiedHtml, screenshot, log);
    if (!aiComponents.length) return { components: [], pageCss };

    const matchScript = createMatchComponentsScript(aiComponents);
    const matched = await webview.executeJavaScript(matchScript) as ExtractedComponent[];
    await log("Matched " + matched.length + " component(s) in the DOM");
    return { components: matched, pageCss };
  } catch (error) {
    await log("Component extraction failed (non-blocking): " + (error instanceof Error ? error.message : String(error)));
    return { components: [], pageCss: "" };
  }
}

async function captureResizedScreenshot(webview: Electron.WebviewTag): Promise<string> {
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await new Promise(resolve => setTimeout(resolve, 100));
  const fullImage = await webview.capturePage();
  const resized = fullImage.resize({ width: Math.min(800, fullImage.getSize().width) });
  return resized.toDataURL();
}

type AiComponentResult = { name: string; selector: string; count: number; description: string; props: { name: string; type: string; description: string }[] };

async function callAiWithFallback(
  simplifiedHtml: string, screenshot: string, log: (...args: unknown[]) => Promise<void>,
): Promise<AiComponentResult[]> {
  const result = await window.api.aiExtractComponents({ simplifiedHtml, screenshot });
  if (result.success && result.components?.length) {
    await log("AI identified " + result.components.length + " component(s) (with screenshot)");
    return result.components;
  }
  if (!result.error) return [];
  await log("AI with screenshot failed: " + result.error + ". Retrying text-only...");
  const retry = await window.api.aiExtractComponents({ simplifiedHtml });
  if (retry.success && retry.components?.length) {
    await log("AI identified " + retry.components.length + " component(s) (text-only)");
    return retry.components;
  }
  await log("AI text-only: " + (retry.error || "no components found"));
  return [];
}
