import { ipcMain } from "electron";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { extractAndSaveAssets } from "../assets";
import { downloadExternalAssets } from "../download-assets";
import type { ProjectMeta } from "../projects";
import { ensureProjectDir, getProjectDir, getProjectsIndex, saveProjectsIndex, duplicateProject } from "../projects";
import { extractFontFaceCss } from "./FontFaceUtils";
import { extractProjectIconFontGlyphs } from "./FontGlyphUtils";
import { handleRegenerateProjectThumbnail } from "./thumbnail";

type SaveProjectData = { url: string; title: string; html: string; thumbnail?: string };
type ProjectAssets = { typography: unknown[]; colors: unknown[]; fontFaceCss?: string; icons?: { libraries: string[] }; components?: unknown[]; componentsCss?: string };
type ProjectHistoryData = { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] };

function projectFilePath(id: string, filename: string) { return path.join(getProjectDir(id), filename); }

function updateProjectTimestampAndThumbnail(id: string, event: Electron.IpcMainInvokeEvent) {
  const projects = getProjectsIndex(), p = projects.find((e) => e.id === id);
  if (p) { p.updatedAt = new Date().toISOString(); p.thumbnailStale = true; saveProjectsIndex(projects); }
  handleRegenerateProjectThumbnail(event, id).catch(() => { /* Thumbnail generation failed, but update succeeded */ });
}

function removeSnapshots(id: string, startIndex = 0) {
  for (let i = startIndex; fs.existsSync(projectFilePath(id, `snap.${i}.html`)); i++) fs.unlinkSync(projectFilePath(id, `snap.${i}.html`));
}

async function handleSaveProject(_event: Electron.IpcMainInvokeEvent, data: SaveProjectData) {
  const id = crypto.randomUUID(), now = new Date().toISOString(), meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };
  ensureProjectDir(id);
  const processedHtml = await downloadExternalAssets(id, extractAndSaveAssets(id, data.html));
  fs.writeFileSync(projectFilePath(id, "project.html"), processedHtml, "utf-8");
  if (data.thumbnail) fs.writeFileSync(projectFilePath(id, "thumbnail.png"), data.thumbnail.replace(/^data:image\/png;base64,/, ""), "base64");
  const projects = getProjectsIndex();
  projects.unshift(meta);
  saveProjectsIndex(projects);
  return { ...meta, fontFaceCss: extractFontFaceCss(processedHtml) };
}

function handleLoadProject(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };
  return { success: true, html: fs.readFileSync(htmlPath, "utf-8"), assetsBasePath: `mp-asset://assets/${id}/` };
}

async function handleUpdateProjectHtml(_event: Electron.IpcMainInvokeEvent, id: string, html: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false };
  fs.writeFileSync(htmlPath, extractAndSaveAssets(id, html), "utf-8");
  updateProjectTimestampAndThumbnail(id, _event);
  return { success: true };
}

function handleSaveProjectAssets(_event: Electron.IpcMainInvokeEvent, id: string, assets: ProjectAssets) {
  try {
    ensureProjectDir(id);
    if (assets.components) assets.components = (assets.components as { html: string }[]).map((c) => ({ ...c, html: extractAndSaveAssets(id, c.html) }));
    if (assets.componentsCss) assets.componentsCss = extractAndSaveAssets(id, assets.componentsCss);
    fs.writeFileSync(projectFilePath(id, "assets.json"), JSON.stringify(assets, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function handleLoadProjectAssets(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const assetsPath = projectFilePath(id, "assets.json");
    return fs.existsSync(assetsPath) 
      ? { success: true, assets: JSON.parse(fs.readFileSync(assetsPath, "utf-8")) }
      : { success: true, assets: { typography: [], colors: [] } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function handleSaveProjectHistory(_event: Electron.IpcMainInvokeEvent, id: string, data: ProjectHistoryData) {
  try {
    ensureProjectDir(id);
    fs.writeFileSync(projectFilePath(id, "history.json"), JSON.stringify({ entries: data.entries, pointer: data.pointer }), "utf-8");
    for (let index = 0; index < data.htmlSnapshots.length; index += 1) fs.writeFileSync(projectFilePath(id, `snap.${index}.html`), extractAndSaveAssets(id, data.htmlSnapshots[index]), "utf-8");
    removeSnapshots(id, data.htmlSnapshots.length);
    return { success: true };
  } catch {
    return { success: false };
  }
}

function handleLoadProjectHistory(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const metaPath = projectFilePath(id, "history.json");
    if (!fs.existsSync(metaPath)) return { success: false };
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { entries: { label: string; timestamp: number }[]; pointer: number };
    const htmlSnapshots = meta.entries.map((_entry, index) => {
      const snapshotPath = projectFilePath(id, `snap.${index}.html`);
      if (!fs.existsSync(snapshotPath)) throw new Error("Missing snapshot");
      return fs.readFileSync(snapshotPath, "utf-8");
    });
    return { success: true, entries: meta.entries, pointer: meta.pointer, htmlSnapshots };
  } catch {
    return { success: false };
  }
}

function handleRenameProject(_event: Electron.IpcMainInvokeEvent, id: string, newTitle: string) {
  const projects = getProjectsIndex(), project = projects.find((entry) => entry.id === id);
  if (!project) return { success: false };
  project.title = newTitle;
  project.updatedAt = new Date().toISOString();
  saveProjectsIndex(projects);
  return { success: true };
}

function handleDeleteProject(_event: Electron.IpcMainInvokeEvent, id: string) {
  saveProjectsIndex(getProjectsIndex().filter((entry) => entry.id !== id));
  const projectDir = getProjectDir(id);
  if (fs.existsSync(projectDir)) fs.rmSync(projectDir, { recursive: true, force: true });
  return { success: true };
}

function handleGetProjectThumbnail(_event: Electron.IpcMainInvokeEvent, id: string) {
  const p = projectFilePath(id, "thumbnail.png");
  return fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p, "base64")}` : null;
}

function handleExtractIconFontGlyphs(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    return extractProjectIconFontGlyphs(getProjectDir(id)).then((fonts) => ({ success: true, fonts }));
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function registerProjectHandlers() {
  ipcMain.handle("list-projects", () => getProjectsIndex());
  ipcMain.handle("save-project", handleSaveProject);
  ipcMain.handle("load-project", handleLoadProject);
  ipcMain.handle("update-project-html", handleUpdateProjectHtml);
  ipcMain.handle("save-project-assets", handleSaveProjectAssets);
  ipcMain.handle("load-project-assets", handleLoadProjectAssets);
  ipcMain.handle("save-project-history", handleSaveProjectHistory);
  ipcMain.handle("load-project-history", handleLoadProjectHistory);
  ipcMain.handle("rename-project", handleRenameProject);
  ipcMain.handle("delete-project", handleDeleteProject);
  ipcMain.handle("duplicate-project", (_e, id: string) => duplicateProject(id));
  ipcMain.handle("get-project-thumbnail", handleGetProjectThumbnail);
  ipcMain.handle("regenerate-project-thumbnail", handleRegenerateProjectThumbnail);
  ipcMain.handle("extract-icon-font-glyphs", handleExtractIconFontGlyphs);
}
