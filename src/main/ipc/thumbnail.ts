import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

import { getProjectDir, getProjectsIndex, saveProjectsIndex } from "../projects";

function projectFilePath(id: string, filename: string) { return path.join(getProjectDir(id), filename); }

export async function handleRegenerateProjectThumbnail(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { offscreen: true },
  });

  try {
    // Load via the mp-asset:// protocol so relative asset references resolve and
    // we avoid Chromium's URL-length limit (project.html can be multi-MB).
    await win.loadURL(`mp-asset://assets/${id}/project.html`);
    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const image = await win.webContents.capturePage();
    const base64Data = image.toPNG().toString("base64");
    fs.writeFileSync(projectFilePath(id, "thumbnail.png"), base64Data, "base64");

    // Clear stale flag
    const projects = getProjectsIndex();
    const p = projects.find((e) => e.id === id);
    if (p) { p.thumbnailStale = false; saveProjectsIndex(projects); }

    return { success: true, thumbnail: `data:image/png;base64,${base64Data}` };
  } catch (error) {
    return { success: false, error: String(error) };
  } finally {
    win.destroy();
  }
}
