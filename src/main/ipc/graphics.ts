import { ipcMain } from "electron";
import fs from "fs";
import path from "path";

import { getProjectDir } from "../projects";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "bmp", "ico"]);

function handleListProjectGraphics(_event: Electron.IpcMainInvokeEvent, id: string) {
  const assetsDir = path.join(getProjectDir(id), "assets");
  if (!fs.existsSync(assetsDir)) return { success: true, graphics: [] };
  try {
    const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    const graphics = entries
      .filter((entry) => {
        if (!entry.isFile()) return false;
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
      })
      .map((entry) => {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        const stats = fs.statSync(path.join(assetsDir, entry.name));
        return { filename: entry.name, extension: ext, sizeBytes: stats.size };
      });
    return { success: true, graphics };
  } catch {
    return { success: true, graphics: [] };
  }
}

export function registerGraphicsHandlers() {
  ipcMain.handle("list-project-graphics", handleListProjectGraphics);
}
