import { ipcMain } from "electron";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { extractAndSaveAssets } from "../assets";
import { downloadExternalAssets } from "../download-assets";
import type { ProjectMeta } from "../projects";
import { ensureProjectDir, getProjectDir, getProjectsIndex, saveProjectsIndex } from "../projects";
import { extractFontFaceCss } from "./FontFaceUtils";

type SaveProjectData = { url: string; title: string; html: string; thumbnail?: string };
type ProjectAssets = { typography: unknown[]; colors: unknown[]; fontFaceCss?: string; icons?: { libraries: string[] }; components?: unknown[]; componentsCss?: string };
type ProjectHistoryData = { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] };

function projectFilePath(id: string, filename: string) { return path.join(getProjectDir(id), filename); }

function updateProjectTimestamp(id: string) {
  const projects = getProjectsIndex();
  const p = projects.find((e) => e.id === id);
  if (p) { p.updatedAt = new Date().toISOString(); saveProjectsIndex(projects); }
}

function removeSnapshots(id: string, startIndex = 0) {
  for (let i = startIndex; fs.existsSync(projectFilePath(id, `snap.${i}.html`)); i++) fs.unlinkSync(projectFilePath(id, `snap.${i}.html`));
}

function listProjects() { return getProjectsIndex(); }

async function handleSaveProject(_event: Electron.IpcMainInvokeEvent, data: SaveProjectData) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };
  ensureProjectDir(id);
  let processedHtml = extractAndSaveAssets(id, data.html);
  processedHtml = await downloadExternalAssets(id, processedHtml);
  fs.writeFileSync(projectFilePath(id, "project.html"), processedHtml, "utf-8");
  if (data.thumbnail) {
    const base64Data = data.thumbnail.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(projectFilePath(id, "thumbnail.png"), base64Data, "base64");
  }
  const projects = getProjectsIndex();
  projects.unshift(meta);
  saveProjectsIndex(projects);
  const fontFaceCss = extractFontFaceCss(processedHtml);
  return { ...meta, fontFaceCss };
}

function handleLoadProject(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };
  return { success: true, html: fs.readFileSync(htmlPath, "utf-8"), assetsBasePath: `mp-asset://assets/${id}/` };
}

function handleUpdateProjectHtml(_event: Electron.IpcMainInvokeEvent, id: string, html: string) {
  const htmlPath = projectFilePath(id, "project.html");
  if (!fs.existsSync(htmlPath)) return { success: false };
  fs.writeFileSync(htmlPath, extractAndSaveAssets(id, html), "utf-8");
  updateProjectTimestamp(id);
  return { success: true };
}

function handleSaveProjectAssets(_event: Electron.IpcMainInvokeEvent, id: string, assets: ProjectAssets) {
  try {
    ensureProjectDir(id);
    if (assets.components) {
      assets.components = (assets.components as { html: string }[]).map((c) => ({ ...c, html: extractAndSaveAssets(id, c.html) }));
    }
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
    if (!fs.existsSync(assetsPath)) return { success: true, assets: { typography: [], colors: [] } };
    return { success: true, assets: JSON.parse(fs.readFileSync(assetsPath, "utf-8")) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function handleSaveProjectHistory(_event: Electron.IpcMainInvokeEvent, id: string, data: ProjectHistoryData) {
  try {
    ensureProjectDir(id);
    fs.writeFileSync(projectFilePath(id, "history.json"), JSON.stringify({ entries: data.entries, pointer: data.pointer }), "utf-8");
    for (let index = 0; index < data.htmlSnapshots.length; index += 1) {
      fs.writeFileSync(projectFilePath(id, `snap.${index}.html`), extractAndSaveAssets(id, data.htmlSnapshots[index]), "utf-8");
    }
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
  const projects = getProjectsIndex();
  const project = projects.find((entry) => entry.id === id);
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

export function registerProjectHandlers() {
  ipcMain.handle("list-projects", listProjects);
  ipcMain.handle("save-project", handleSaveProject);
  ipcMain.handle("load-project", handleLoadProject);
  ipcMain.handle("update-project-html", handleUpdateProjectHtml);
  ipcMain.handle("save-project-assets", handleSaveProjectAssets);
  ipcMain.handle("load-project-assets", handleLoadProjectAssets);
  ipcMain.handle("save-project-history", handleSaveProjectHistory);
  ipcMain.handle("load-project-history", handleLoadProjectHistory);
  ipcMain.handle("rename-project", handleRenameProject);
  ipcMain.handle("delete-project", handleDeleteProject);
  ipcMain.handle("get-project-thumbnail", handleGetProjectThumbnail);
}
