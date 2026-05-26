import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

import { getProjectDir, getProjectsIndex, projectsDir, saveProjectsIndex } from "../projects";

function projectFilePath(id: string, filename: string) { return path.join(getProjectDir(id), filename); }

export async function handleRegenerateProjectThumbnail(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };

  const html = fs.readFileSync(htmlPath, "utf-8");
  const assetsBaseUrl = `file://${path.join(projectsDir, id, "assets")}/`;

  // Rewrite relative asset paths to absolute file URLs for the hidden window
  const resolvedHtml = html.replace(/mp-asset:\/\/assets\/[^/]+\//g, assetsBaseUrl);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { offscreen: true },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(resolvedHtml)}`);
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
