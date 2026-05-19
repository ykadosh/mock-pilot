import { app, shell } from "electron";
import path from "path";
import fs from "fs";

import { cleanHtmlForExport } from "./export";

export async function handleDeployCodesandbox(
  _event: Electron.IpcMainInvokeEvent,
  data: { html: string; css?: string; baseUrl?: string }
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LZString = require("lz-string");

    let htmlContent = cleanHtmlForExport(data.html, data.baseUrl);

    htmlContent = htmlContent
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/^\s+/gm, "");

    const files: Record<string, { content: string }> = {};

    if (data.css) {
      let css = data.css;
      css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
      files["styles.css"] = { content: css };
      if (!htmlContent.includes('href="styles.css"')) {
        htmlContent = htmlContent.replace(
          /<\/head>/i,
          '  <link rel="stylesheet" href="styles.css">\n</head>'
        );
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

    const totalSize = Object.values(files).reduce((sum, f) => sum + f.content.length, 0);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    if (totalSize > 5 * 1024 * 1024) {
      return {
        success: false,
        error: `Project is too large for CodeSandbox (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`,
      };
    }

    const parameters = LZString.compressToBase64(JSON.stringify({ files }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const tmpDir = path.join(app.getPath("temp"), "mockpilot-deploy");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, "deploy.html");

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

    fs.writeFileSync(tmpFile, formHtml, "utf-8");
    await shell.openExternal(`file://${tmpFile}`);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
