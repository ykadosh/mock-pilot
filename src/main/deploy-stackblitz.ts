import { app, shell } from "electron";
import path from "path";
import fs from "fs";

import { cleanHtmlForExport } from "./export";

export async function handleDeployStackblitz(
  _event: Electron.IpcMainInvokeEvent,
  data: { html: string; css?: string; baseUrl?: string }
) {
  try {
    let htmlContent = cleanHtmlForExport(data.html, data.baseUrl);

    htmlContent = htmlContent
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/^\s+/gm, "");

    const files: Record<string, string> = {};

    if (data.css) {
      let css = data.css;
      css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
      files["styles.css"] = css;
      if (!htmlContent.includes('href="styles.css"')) {
        htmlContent = htmlContent.replace(
          /<\/head>/i,
          '  <link rel="stylesheet" href="styles.css">\n</head>'
        );
      }
    }

    files["index.html"] = htmlContent;

    const totalSize = Object.values(files).reduce((sum, f) => sum + f.length, 0);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    if (totalSize > 5 * 1024 * 1024) {
      return {
        success: false,
        error: `Project is too large for StackBlitz (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`,
      };
    }

    const formFields = Object.entries(files)
      .map(([name, content]) => {
        const escaped = content.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<input type="hidden" name="project[files][${name}]" value="${escaped}">`;
      })
      .join("\n    ");

    const tmpDir = path.join(app.getPath("temp"), "mockpilot-deploy");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, "stackblitz.html");

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

    fs.writeFileSync(tmpFile, formHtml, "utf-8");
    await shell.openExternal(`file://${tmpFile}`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
