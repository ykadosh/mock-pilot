import { app, ipcMain, shell } from "electron";
import fs from "fs";
import path from "path";

import { compareVersions } from "./export";
import { appSettingsPath, ensureProjectsDir, getDirSize, getProjectsIndex, projectsDir } from "./projects";

export function registerSettingsHandlers() {
  ipcMain.handle("get-app-settings", () => {
    try {
      if (fs.existsSync(appSettingsPath)) {
        return JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
      }
    } catch { /* ignore */ }
    return { aiModel: "gpt-4o" };
  });

  ipcMain.handle("save-app-settings", (_event, settings: { aiModel: string }) => {
    fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2), "utf-8");
    return { success: true };
  });

  ipcMain.handle("get-storage-info", () => {
    ensureProjectsDir();
    const totalBytes = getDirSize(projectsDir);
    const projects = getProjectsIndex();
    return { totalBytes, projectCount: projects.length };
  });

  ipcMain.handle("get-project-size", (_event, id: string) => {
    ensureProjectsDir();
    let totalBytes = 0;
    const entries = fs.readdirSync(projectsDir);
    for (const entry of entries) {
      if (entry.startsWith(`${id}.`) || entry === id) {
        const fullPath = path.join(projectsDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) totalBytes += stat.size;
      }
    }
    return { totalBytes };
  });

  ipcMain.handle("check-for-updates", async () => {
    try {
      const currentVersion = app.getVersion();
      const response = await fetch("https://api.github.com/repos/ykadosh/mock-pilot/releases/latest", {
        headers: { "Accept": "application/vnd.github+json" },
      });
      if (!response.ok) return { updateAvailable: false, error: "Failed to check for updates" };
      const release = await response.json() as { tag_name: string; html_url: string; assets: { name: string; browser_download_url: string }[] };
      const latestVersion = release.tag_name.replace(/^v/, "");
      if (compareVersions(latestVersion, currentVersion) > 0) {
        const platform = process.platform === "darwin" ? ".zip" : ".exe";
        const asset = release.assets.find((a: { name: string }) => a.name.endsWith(platform));
        return {
          updateAvailable: true,
          currentVersion,
          latestVersion,
          releaseUrl: release.html_url,
          downloadUrl: asset?.browser_download_url || release.html_url,
        };
      }
      return { updateAvailable: false, currentVersion, latestVersion };
    } catch {
      return { updateAvailable: false, error: "Failed to check for updates" };
    }
  });

  ipcMain.handle("open-external", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle("open-project-in-browser", (_event, id: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false, error: "Project file not found" };
    shell.openPath(htmlPath);
    return { success: true };
  });

  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });
}
