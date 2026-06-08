import fs from "fs";
import path from "path";

import { getProjectDir } from "../projects";

const MAX_HTML_CHARS = 40000;

export interface AssetLike {
  typography?: { id?: string; label?: string; fontFamily?: string; fontSize?: string; fontWeight?: string; lineHeight?: string; letterSpacing?: string; textTransform?: string }[];
  colors?: { id?: string; label?: string; value?: string }[];
  components?: { id?: string; label?: string; description?: string }[];
  icons?: { libraries?: string[] };
}

function truncateHtml(html: string): string {
  if (html.length <= MAX_HTML_CHARS) return html;
  return `${html.slice(0, MAX_HTML_CHARS)}\n<!-- … truncated ${html.length - MAX_HTML_CHARS} chars … -->`;
}

export function loadAssets(projectId: string): AssetLike | null {
  const assetsPath = path.join(getProjectDir(projectId), "assets.json");
  if (!fs.existsSync(assetsPath)) return null;
  try { return JSON.parse(fs.readFileSync(assetsPath, "utf-8")); } catch { return null; }
}

export function loadHtml(projectId: string): string | null {
  const htmlPath = path.join(getProjectDir(projectId), "project.html");
  if (!fs.existsSync(htmlPath)) return null;
  try { return fs.readFileSync(htmlPath, "utf-8"); } catch { return null; }
}

function assetsToJson(assets: AssetLike): string {
  return JSON.stringify({
    colors: assets.colors ?? [],
    typography: assets.typography ?? [],
    components: (assets.components ?? []).map((c) => ({ id: c.id, label: c.label, description: c.description })),
    icons: assets.icons ?? {},
  }, null, 2);
}

export function buildGenerationUserMessage(html: string | null, assets: AssetLike | null): string {
  const parts: string[] = ["Generate a starter `design.md` for the following captured website."];
  if (assets) parts.push("\n## Extracted assets (JSON)\n```json\n" + assetsToJson(assets) + "\n```");
  if (html) parts.push("\n## Captured HTML (possibly truncated)\n```html\n" + truncateHtml(html) + "\n```");
  parts.push("\nReturn ONLY the raw Markdown content for design.md.");
  return parts.join("\n");
}

export function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}
