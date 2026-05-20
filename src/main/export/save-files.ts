import { BrowserWindow, dialog } from "electron";
import path from "path";
import fs from "fs";

import { getProjectDir } from "../projects";
import { cleanHtmlForExport } from "./index";

type ExportSaveFilesData = { projectId: string; html: string; baseUrl?: string };
type ExtractedStyles = { html: string; css: string };

function extractStylesFromHtml(html: string): ExtractedStyles {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let cssContent = "";
  let match: RegExpExecArray | null;
  const styleTags: string[] = [];

  while ((match = styleRegex.exec(html)) !== null) {
    cssContent += `${match[1].trim()}\n\n`;
    styleTags.push(match[0]);
  }
  if (!cssContent.trim()) return { html, css: "" };

  let htmlForFile = html;
  for (const tag of styleTags) {
    htmlForFile = htmlForFile.replace(tag, "");
  }

  return {
    html: htmlForFile.replace(/<\/head>/i, '  <link rel="stylesheet" href="styles.css">\n</head>'),
    css: cssContent.trim(),
  };
}

function copyProjectAssets(options: { projectId: string; destDir: string; html: string; css: string }): ExtractedStyles {
  const { projectId, destDir, html, css } = options;
  const assetsDir = path.join(getProjectDir(projectId), "assets");
  if (!fs.existsSync(assetsDir)) return { html, css };

  const destAssetsDir = path.join(destDir, "assets");
  fs.mkdirSync(destAssetsDir, { recursive: true });
  for (const file of fs.readdirSync(assetsDir)) {
    fs.copyFileSync(path.join(assetsDir, file), path.join(destAssetsDir, file));
  }

  return { html, css };
}

function writeExportFiles(destDir: string, html: string, css: string): void {
  if (css) {
    fs.writeFileSync(path.join(destDir, "styles.css"), css, "utf-8");
  }
  fs.writeFileSync(path.join(destDir, "index.html"), html, "utf-8");
}

export async function handleExportSaveFiles(
  _event: Electron.IpcMainInvokeEvent,
  data: ExportSaveFilesData
) {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: "No window available" };

    const result = await dialog.showOpenDialog(win, {
      title: "Choose export folder",
      buttonLabel: "Save",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: "cancelled" };
    }

    const destDir = result.filePaths[0];
    const fullHtml = cleanHtmlForExport(data.html, data.baseUrl);
    const extracted = extractStylesFromHtml(fullHtml);
    const exported = copyProjectAssets({
      projectId: data.projectId,
      destDir,
      html: extracted.html,
      css: extracted.css,
    });

    writeExportFiles(destDir, exported.html, exported.css);
    return { success: true, path: destDir };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
