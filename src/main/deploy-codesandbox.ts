import { app, shell } from "electron";
import path from "path";
import fs from "fs";

import { cleanHtmlForExport } from "./export";

type DeployCodesandboxData = { html: string; css?: string; baseUrl?: string };
type CodesandboxFiles = Record<string, { content: string }>;

function normalizeContent(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
}

function validateCodesandboxSize(files: CodesandboxFiles): void {
  const totalSize = Object.values(files).reduce((sum, file) => sum + file.content.length, 0);
  if (totalSize <= 5 * 1024 * 1024) return;

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
  throw new Error(`Project is too large for CodeSandbox (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`);
}

function buildCodesandboxFiles(html: string, css?: string, baseUrl?: string): CodesandboxFiles {
  let htmlContent = normalizeContent(cleanHtmlForExport(html, baseUrl));
  const files: CodesandboxFiles = {};

  if (css) {
    const cleanedCss = normalizeContent(css.replace(/\/\*[\s\S]*?\*\//g, ""));
    files["styles.css"] = { content: cleanedCss };
    if (!htmlContent.includes('href="styles.css"')) {
      htmlContent = htmlContent.replace(/<\/head>/i, '  <link rel="stylesheet" href="styles.css">\n</head>');
    }
  }

  files["index.html"] = { content: htmlContent };
  files["package.json"] = {
    content: JSON.stringify({
      name: "mockpilot-export",
      version: "1.0.0",
      description: "Exported from MockPilot",
      main: "index.html",
    }, null, 2),
  };
  validateCodesandboxSize(files);
  return files;
}

function buildDeployFilePath(fileName: string): string {
  const deployDir = path.join(app.getPath("userData"), "mockpilot-deploy");
  fs.mkdirSync(deployDir, { recursive: true });
  return path.join(deployDir, fileName);
}

async function openCodesandboxForm(parameters: string): Promise<void> {
  const formHtml = `<!DOCTYPE html>
<html>
<head><title>Deploying to CodeSandbox...</title></head>
<body style="background:#0b1326;color:#dae2fd;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Deploying to CodeSandbox…</p>
  <form id="f" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST">
    <input type="hidden" name="parameters" value="${parameters}">
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;

  const formPath = buildDeployFilePath("codesandbox.html");
  fs.writeFileSync(formPath, formHtml, "utf-8");
  await shell.openExternal(`file://${formPath}`);
}

export async function handleDeployCodesandbox(
  _event: Electron.IpcMainInvokeEvent,
  data: DeployCodesandboxData
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LZString = require("lz-string");
    const files = buildCodesandboxFiles(data.html, data.css, data.baseUrl);
    const parameters = LZString.compressToBase64(JSON.stringify({ files }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await openCodesandboxForm(parameters);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
