import { app, ipcMain, shell } from "electron";
import fs from "fs";
import path from "path";

import { compareVersions } from "../export";
import { appSettingsPath, ensureProjectsDir, getDirSize, getProjectsIndex, projectsDir } from "../projects";

type AppSettings = { aiModel: string };
type ReleaseAsset = { name: string; browser_download_url: string };
type ReleaseInfo = { tag_name: string; html_url: string; assets: ReleaseAsset[] };

function getAppSettings() {
  try {
    if (fs.existsSync(appSettingsPath)) return JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
  } catch {
    // ignore invalid settings and fall back to defaults
  }
  return { aiModel: "gpt-4o" };
}

function handleSaveAppSettings(_event: Electron.IpcMainInvokeEvent, settings: AppSettings) {
  fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2), "utf-8");
  return { success: true };
}

function handleGetStorageInfo() {
  ensureProjectsDir();
  return { totalBytes: getDirSize(projectsDir), projectCount: getProjectsIndex().length };
}

function handleGetProjectSize(_event: Electron.IpcMainInvokeEvent, id: string) {
  ensureProjectsDir();
  let totalBytes = 0;
  for (const entry of fs.readdirSync(projectsDir)) {
    if (!entry.startsWith(`${id}.`) && entry !== id) continue;
    const stat = fs.statSync(path.join(projectsDir, entry));
    if (stat.isFile()) totalBytes += stat.size;
  }
  return { totalBytes };
}

async function handleCheckForUpdates() {
  try {
    const currentVersion = app.getVersion();
    const response = await fetch("https://api.github.com/repos/ykadosh/mock-pilot/releases/latest", { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) return { updateAvailable: false, error: "Failed to check for updates" };
    const release = await response.json() as ReleaseInfo;
    const latestVersion = release.tag_name.replace(/^v/, "");
    if (compareVersions(latestVersion, currentVersion) <= 0) return { updateAvailable: false, currentVersion, latestVersion };
    const extension = process.platform === "darwin" ? ".zip" : ".exe";
    const asset = release.assets.find((entry) => entry.name.endsWith(extension));
    return { updateAvailable: true, currentVersion, latestVersion, releaseUrl: release.html_url, downloadUrl: asset?.browser_download_url || release.html_url };
  } catch {
    return { updateAvailable: false, error: "Failed to check for updates" };
  }
}

function handleOpenExternal(_event: Electron.IpcMainInvokeEvent, url: string) {
  shell.openExternal(url);
}

function handleOpenProjectInBrowser(_event: Electron.IpcMainInvokeEvent, id: string) {
  const htmlPath = path.join(projectsDir, `${id}.html`);
  if (!fs.existsSync(htmlPath)) return { success: false, error: "Project file not found" };
  shell.openPath(htmlPath);
  return { success: true };
}

function getAppVersion() {
  return app.getVersion();
}

export function registerSettingsHandlers() {
  ipcMain.handle("get-app-settings", getAppSettings);
  ipcMain.handle("save-app-settings", handleSaveAppSettings);
  ipcMain.handle("get-storage-info", handleGetStorageInfo);
  ipcMain.handle("get-project-size", handleGetProjectSize);
  ipcMain.handle("check-for-updates", handleCheckForUpdates);
  ipcMain.handle("open-external", handleOpenExternal);
  ipcMain.handle("open-project-in-browser", handleOpenProjectInBrowser);
  ipcMain.handle("get-app-version", getAppVersion);
}
