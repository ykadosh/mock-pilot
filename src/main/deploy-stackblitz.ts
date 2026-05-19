import { app, shell } from "electron";
import path from "path";
import fs from "fs";

import { cleanHtmlForExport } from "./export";

type DeployStackblitzData = { html: string; css?: string; baseUrl?: string };
type StackblitzFiles = Record<string, string>;

function normalizeContent(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
}

function validateStackblitzSize(files: StackblitzFiles): void {
  const totalSize = Object.values(files).reduce((sum, file) => sum + file.length, 0);
  if (totalSize <= 5 * 1024 * 1024) return;

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
  throw new Error(`Project is too large for StackBlitz (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`);
}

function buildStackblitzFiles(html: string, css?: string, baseUrl?: string): StackblitzFiles {
  let htmlContent = normalizeContent(cleanHtmlForExport(html, baseUrl));
  const files: StackblitzFiles = {};

  if (css) {
    const cleanedCss = normalizeContent(css.replace(/\/\*[\s\S]*?\*\//g, ""));
    files["styles.css"] = cleanedCss;
    if (!htmlContent.includes('href="styles.css"')) {
      htmlContent = htmlContent.replace(/<\/head>/i, '  <link rel="stylesheet" href="styles.css">\n</head>');
    }
  }

  files["index.html"] = htmlContent;
  validateStackblitzSize(files);
  return files;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildDeployFilePath(fileName: string): string {
  const deployDir = path.join(app.getPath("userData"), "mockpilot-deploy");
  fs.mkdirSync(deployDir, { recursive: true });
  return path.join(deployDir, fileName);
}

async function openStackblitzForm(files: StackblitzFiles): Promise<void> {
  const formFields = Object.entries(files)
    .map(([name, content]) => `<input type="hidden" name="project[files][${name}]" value="${escapeHtmlAttribute(content)}">`)
    .join("\n    ");
  const formHtml = `<!DOCTYPE html>
<html>
<head><title>Opening in StackBlitz...</title></head>
<body style="background:#0b1326;color:#dae2fd;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Opening in StackBlitz…</p>
  <form id="f" action="https://stackblitz.com/run" method="POST" target="_self">
    <input type="hidden" name="project[title]" value="MockPilot Export">
    <input type="hidden" name="project[description]" value="Exported from MockPilot">
    <input type="hidden" name="project[template]" value="html">
    ${formFields}
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;

  const formPath = buildDeployFilePath("stackblitz.html");
  fs.writeFileSync(formPath, formHtml, "utf-8");
  await shell.openExternal(`file://${formPath}`);
}

export async function handleDeployStackblitz(
  _event: Electron.IpcMainInvokeEvent,
  data: DeployStackblitzData
) {
  try {
    const files = buildStackblitzFiles(data.html, data.css, data.baseUrl);
    await openStackblitzForm(files);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
