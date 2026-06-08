import { ipcMain } from "electron";
import fs from "fs";
import path from "path";

import { getProjectDir, readProjectDesign, writeProjectDesign, deleteProjectDesign } from "../projects";
import { getToken } from "../auth";
import { getSelectedAiModel, getAiApiToken, requestChatCompletion } from "./ai-shared";

const DESIGN_GEN_SYSTEM_PROMPT = `You are a senior design systems writer. Given an extracted snapshot of a website (its captured HTML and structured asset library: colors, typography, components, icons), produce a concise but thorough \`design.md\` file written in Markdown that describes the project's design language so an LLM can reliably stay on-brand when editing the page later.

Rules:
- Output ONLY the raw Markdown content of design.md — no surrounding code fences, no preamble, no commentary.
- Ground every claim in the supplied evidence. If a section can't be inferred, omit it instead of inventing it.
- Keep it focused and skimmable. Aim for ~200-500 lines max. Use short paragraphs and bullet lists.
- Cover (when supported by evidence): Overview / tone & voice, Color palette (with hex values and intended usage), Typography scale (families, sizes, weights, line-heights, what each is used for), Spacing & layout rhythm, Component patterns (shape, radius, elevation, density), Iconography style, Imagery / graphics treatment, Do's & don'ts.
- Do NOT include implementation code beyond the occasional inline example. This is a natural-language design spec, not a stylesheet.`;

interface AssetLike {
  typography?: { id?: string; label?: string; fontFamily?: string; fontSize?: string; fontWeight?: string; lineHeight?: string; letterSpacing?: string; textTransform?: string }[];
  colors?: { id?: string; label?: string; value?: string }[];
  components?: { id?: string; label?: string; description?: string }[];
  icons?: { libraries?: string[] };
}

function truncateHtml(html: string, maxChars = 40000): string {
  if (html.length <= maxChars) return html;
  return `${html.slice(0, maxChars)}\n<!-- … truncated ${html.length - maxChars} chars … -->`;
}

function loadAssets(projectId: string): AssetLike | null {
  const assetsPath = path.join(getProjectDir(projectId), "assets.json");
  if (!fs.existsSync(assetsPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(assetsPath, "utf-8"));
  } catch {
    return null;
  }
}

function loadHtml(projectId: string): string | null {
  const htmlPath = path.join(getProjectDir(projectId), "project.html");
  if (!fs.existsSync(htmlPath)) return null;
  try {
    return fs.readFileSync(htmlPath, "utf-8");
  } catch {
    return null;
  }
}

function buildGenerationUserMessage(html: string | null, assets: AssetLike | null): string {
  const parts: string[] = [];
  parts.push("Generate a starter `design.md` for the following captured website.");

  if (assets) {
    parts.push("\n## Extracted assets (JSON)\n```json\n" + JSON.stringify({
      colors: assets.colors ?? [],
      typography: assets.typography ?? [],
      components: (assets.components ?? []).map((c) => ({ id: c.id, label: c.label, description: c.description })),
      icons: assets.icons ?? {},
    }, null, 2) + "\n```");
  }

  if (html) {
    parts.push("\n## Captured HTML (possibly truncated)\n```html\n" + truncateHtml(html) + "\n```");
  }

  parts.push("\nReturn ONLY the raw Markdown content for design.md.");
  return parts.join("\n");
}

function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

async function handleGetProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const content = readProjectDesign(id);
    return { success: true, content: content ?? "" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleSaveProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string, content: string) {
  try {
    if (typeof content !== "string") return { success: false, error: "Invalid content" };
    if (content.trim().length === 0) {
      deleteProjectDesign(id);
    } else {
      writeProjectDesign(id, content);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleDeleteProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    deleteProjectDesign(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleGenerateProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
    const aiModel = getSelectedAiModel();
    const apiToken = await getAiApiToken(aiModel, token);

    const html = loadHtml(id);
    const assets = loadAssets(id);
    if (!html && !assets) return { success: false, error: "No captured content available to analyze." };

    const userMessage = buildGenerationUserMessage(html, assets);
    const raw = await requestChatCompletion({
      aiModel,
      apiToken,
      systemPrompt: DESIGN_GEN_SYSTEM_PROMPT,
      userMessage,
    });
    const content = stripCodeFences(raw);
    if (!content) return { success: false, error: "Generation produced no content." };
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function registerDesignHandlers() {
  ipcMain.handle("get-project-design", handleGetProjectDesign);
  ipcMain.handle("save-project-design", handleSaveProjectDesign);
  ipcMain.handle("delete-project-design", handleDeleteProjectDesign);
  ipcMain.handle("generate-project-design", handleGenerateProjectDesign);
}
