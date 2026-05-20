import { ipcMain } from "electron";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { extractAndSaveAssets } from "../assets";
import { downloadExternalAssets } from "../download-assets";
import type { ProjectMeta } from "../projects";
import { getProjectsIndex, projectsDir, saveProjectsIndex } from "../projects";

type SaveProjectData = { url: string; title: string; html: string; thumbnail?: string };
type ProjectAssets = { typography: unknown[]; colors: unknown[] };
type ProjectHistoryData = { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] };

function projectPath(name: string) {
  return path.join(projectsDir, name);
}

function updateProjectTimestamp(id: string) {
  const projects = getProjectsIndex();
  const project = projects.find((entry) => entry.id === id);
  if (!project) return;
  project.updatedAt = new Date().toISOString();
  saveProjectsIndex(projects);
}

function removeIfExists(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function removeSnapshots(id: string, startIndex = 0) {
  let index = startIndex;
  while (fs.existsSync(projectPath(`${id}.snap.${index}.html`))) {
    fs.unlinkSync(projectPath(`${id}.snap.${index}.html`));
    index += 1;
  }
}

function listProjects() {
  return getProjectsIndex();
}

async function handleSaveProject(_event: Electron.IpcMainInvokeEvent, data: SaveProjectData) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };
  let processedHtml = extractAndSaveAssets(id, data.html);
  processedHtml = await downloadExternalAssets(id, processedHtml);
  fs.writeFileSync(projectPath(`${id}.html`), processedHtml, "utf-8");
  if (data.thumbnail) {
    const base64Data = data.thumbnail.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(projectPath(`${id}.png`), base64Data, "base64");
  }
  const projects = getProjectsIndex();
  projects.unshift(meta);
  saveProjectsIndex(projects);
  return meta;
}

function handleLoadProject(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = projectPath(`${id}.html`);
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };
  return { success: true, html: fs.readFileSync(htmlPath, "utf-8"), assetsBasePath: "mp-asset://assets/" };
}

function handleUpdateProjectHtml(_event: Electron.IpcMainInvokeEvent, id: string, html: string) {
  const htmlPath = projectPath(`${id}.html`);
  if (!fs.existsSync(htmlPath)) return { success: false };
  fs.writeFileSync(htmlPath, extractAndSaveAssets(id, html), "utf-8");
  updateProjectTimestamp(id);
  return { success: true };
}

function handleSaveProjectAssets(_event: Electron.IpcMainInvokeEvent, id: string, assets: ProjectAssets) {
  try {
    fs.writeFileSync(projectPath(`${id}.assets.json`), JSON.stringify(assets, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function handleLoadProjectAssets(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const assetsPath = projectPath(`${id}.assets.json`);
    if (!fs.existsSync(assetsPath)) return { success: true, assets: { typography: [], colors: [] } };
    return { success: true, assets: JSON.parse(fs.readFileSync(assetsPath, "utf-8")) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function handleSaveProjectHistory(_event: Electron.IpcMainInvokeEvent, id: string, data: ProjectHistoryData) {
  try {
    fs.writeFileSync(projectPath(`${id}.history.json`), JSON.stringify({ entries: data.entries, pointer: data.pointer }), "utf-8");
    for (let index = 0; index < data.htmlSnapshots.length; index += 1) {
      fs.writeFileSync(projectPath(`${id}.snap.${index}.html`), extractAndSaveAssets(id, data.htmlSnapshots[index]), "utf-8");
    }
    removeSnapshots(id, data.htmlSnapshots.length);
    return { success: true };
  } catch {
    return { success: false };
  }
}

function handleLoadProjectHistory(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const metaPath = projectPath(`${id}.history.json`);
    if (!fs.existsSync(metaPath)) return { success: false };
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { entries: { label: string; timestamp: number }[]; pointer: number };
    const htmlSnapshots = meta.entries.map((_entry, index) => {
      const snapshotPath = projectPath(`${id}.snap.${index}.html`);
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
  removeIfExists(projectPath(`${id}.html`));
  removeIfExists(projectPath(`${id}.png`));
  if (fs.existsSync(projectPath(`${id}.assets`))) fs.rmSync(projectPath(`${id}.assets`), { recursive: true, force: true });
  removeIfExists(projectPath(`${id}.history.json`));
  removeSnapshots(id);
  return { success: true };
}

function handleGetProjectThumbnail(_event: Electron.IpcMainInvokeEvent, id: string) {
  const pngPath = projectPath(`${id}.png`);
  if (!fs.existsSync(pngPath)) return null;
  return `data:image/png;base64,${fs.readFileSync(pngPath, "base64")}`;
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
