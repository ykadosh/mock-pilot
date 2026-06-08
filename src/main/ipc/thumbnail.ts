import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

import { getProjectDir, getProjectsIndex, saveProjectsIndex } from "../projects";
import { writeProjectThumbnail } from "./thumbnail-storage";

function projectFilePath(id: string, filename: string) { return path.join(getProjectDir(id), filename); }

// Card preview is never wider than ~500px on the Projects page; rendering at
// ~1000px keeps it crisp on retina screens while keeping the file tiny.
const THUMBNAIL_RENDER_WIDTH = 1000;
const THUMBNAIL_RENDER_HEIGHT = 700;
const THUMBNAIL_JPEG_QUALITY = 80;

export async function handleRegenerateProjectThumbnail(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };

  const win = new BrowserWindow({
    width: THUMBNAIL_RENDER_WIDTH,
    height: THUMBNAIL_RENDER_HEIGHT,
    show: false,
    webPreferences: { offscreen: true },
  });

  try {
    // Load via the mp-asset:// protocol so relative asset references resolve and
    // we avoid Chromium's URL-length limit (project.html can be multi-MB).
    await win.loadURL(`mp-asset://assets/${id}/project.html`);
    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Only capture the visible viewport (no scrolling/stitching) — the project
    // card only ever shows the top portion of the site.
    const image = await win.webContents.capturePage();
    // Encode as JPEG to a file on disk instead of a base64 PNG: smaller, no
    // ~33% base64 bloat, and decoded off the main thread by Chromium when
    // referenced via mp-asset://.
    const jpegBuffer = image.toJPEG(THUMBNAIL_JPEG_QUALITY);
    const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
    writeProjectThumbnail(id, dataUrl);

    // Clear stale flag
    const projects = getProjectsIndex();
    const p = projects.find((e) => e.id === id);
    if (p) { p.thumbnailStale = false; saveProjectsIndex(projects); }

    const version = fs.statSync(projectFilePath(id, "thumbnail.jpg")).mtimeMs;
    return { success: true, thumbnail: `mp-asset://assets/${id}/thumbnail.jpg?v=${version}` };
  } catch (error) {
    return { success: false, error: String(error) };
  } finally {
    win.destroy();
  }
}
