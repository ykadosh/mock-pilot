import { BrowserWindow, dialog } from "electron";
import path from "path";
import fs from "fs";

import { projectsDir } from "./projects";
import { cleanHtmlForExport } from "./export";

export async function handleExportSaveFiles(
  _event: Electron.IpcMainInvokeEvent,
  data: { projectId: string; html: string; baseUrl?: string }
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

    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cssContent = "";
    let match: RegExpExecArray | null;
    const styleTags: string[] = [];

    while ((match = styleRegex.exec(fullHtml)) !== null) {
      cssContent += match[1].trim() + "\n\n";
      styleTags.push(match[0]);
    }

    let htmlForFile = fullHtml;
    if (cssContent.trim()) {
      for (const tag of styleTags) {
        htmlForFile = htmlForFile.replace(tag, "");
      }
      htmlForFile = htmlForFile.replace(
        /<\/head>/i,
        '  <link rel="stylesheet" href="styles.css">\n</head>'
      );
      fs.writeFileSync(path.join(destDir, "styles.css"), cssContent.trim(), "utf-8");
    }

    fs.writeFileSync(path.join(destDir, "index.html"), htmlForFile, "utf-8");

    const assetsDir = path.join(projectsDir, `${data.projectId}.assets`);
    if (fs.existsSync(assetsDir)) {
      const destAssetsDir = path.join(destDir, "assets");
      if (!fs.existsSync(destAssetsDir)) {
        fs.mkdirSync(destAssetsDir, { recursive: true });
      }
      const files = fs.readdirSync(assetsDir);
      for (const file of files) {
        fs.copyFileSync(path.join(assetsDir, file), path.join(destAssetsDir, file));
      }
      const idAssetsPrefix = `${data.projectId}.assets/`;
      htmlForFile = htmlForFile.split(idAssetsPrefix).join("assets/");
      if (cssContent) {
        cssContent = cssContent.split(idAssetsPrefix).join("assets/");
        fs.writeFileSync(path.join(destDir, "styles.css"), cssContent.trim(), "utf-8");
      }
      fs.writeFileSync(path.join(destDir, "index.html"), htmlForFile, "utf-8");
    }

    return { success: true, path: destDir };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
