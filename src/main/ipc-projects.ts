import { ipcMain } from "electron";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { extractAndSaveAssets } from "./assets";
import { downloadExternalAssets } from "./download-assets";
import type { ProjectMeta } from "./projects";
import { projectsDir, getProjectsIndex, saveProjectsIndex } from "./projects";

export function registerProjectHandlers() {
  ipcMain.handle("list-projects", () => {
    return getProjectsIndex();
  });

  ipcMain.handle("save-project", async (_event, data: { url: string; title: string; html: string; thumbnail?: string }) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };

    let processedHtml = extractAndSaveAssets(id, data.html);
    processedHtml = await downloadExternalAssets(id, processedHtml);
    fs.writeFileSync(path.join(projectsDir, `${id}.html`), processedHtml, "utf-8");

    if (data.thumbnail) {
      const base64Data = data.thumbnail.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(projectsDir, `${id}.png`), base64Data, "base64");
    }

    const projects = getProjectsIndex();
    projects.unshift(meta);
    saveProjectsIndex(projects);

    return meta;
  });

  ipcMain.handle("load-project", (_event, id: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };
    const html = fs.readFileSync(htmlPath, "utf-8");
    const assetsBasePath = "mp-asset://assets/";
    return { success: true, html, assetsBasePath };
  });

  ipcMain.handle("update-project-html", (_event, id: string, html: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false };
    const processedHtml = extractAndSaveAssets(id, html);
    fs.writeFileSync(htmlPath, processedHtml, "utf-8");
    const projects = getProjectsIndex();
    const project = projects.find((p) => p.id === id);
    if (project) {
      project.updatedAt = new Date().toISOString();
      saveProjectsIndex(projects);
    }
    return { success: true };
  });

  ipcMain.handle("save-project-assets", (_event, id: string, assets: { typography: unknown[]; colors: unknown[] }) => {
    try {
      const assetsPath = path.join(projectsDir, `${id}.assets.json`);
      fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2), "utf-8");
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("load-project-assets", (_event, id: string) => {
    try {
      const assetsPath = path.join(projectsDir, `${id}.assets.json`);
      if (!fs.existsSync(assetsPath)) {
        return { success: true, assets: { typography: [], colors: [] } };
      }
      const assets = JSON.parse(fs.readFileSync(assetsPath, "utf-8"));
      return { success: true, assets };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle("save-project-history", (_event, id: string, data: { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] }) => {
    try {
      const metaPath = path.join(projectsDir, `${id}.history.json`);
      fs.writeFileSync(metaPath, JSON.stringify({ entries: data.entries, pointer: data.pointer }), "utf-8");
      for (let i = 0; i < data.htmlSnapshots.length; i++) {
        const processedHtml = extractAndSaveAssets(id, data.htmlSnapshots[i]);
        fs.writeFileSync(path.join(projectsDir, `${id}.snap.${i}.html`), processedHtml, "utf-8");
      }
      let idx = data.htmlSnapshots.length;
      while (fs.existsSync(path.join(projectsDir, `${id}.snap.${idx}.html`))) {
        fs.unlinkSync(path.join(projectsDir, `${id}.snap.${idx}.html`));
        idx++;
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle("load-project-history", (_event, id: string) => {
    try {
      const metaPath = path.join(projectsDir, `${id}.history.json`);
      if (!fs.existsSync(metaPath)) return { success: false };
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      const htmlSnapshots: string[] = [];
      for (let i = 0; i < meta.entries.length; i++) {
        const snapPath = path.join(projectsDir, `${id}.snap.${i}.html`);
        if (!fs.existsSync(snapPath)) return { success: false };
        htmlSnapshots.push(fs.readFileSync(snapPath, "utf-8"));
      }
      return { success: true, entries: meta.entries, pointer: meta.pointer, htmlSnapshots };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle("rename-project", (_event, id: string, newTitle: string) => {
    const projects = getProjectsIndex();
    const project = projects.find((p) => p.id === id);
    if (!project) return { success: false };
    project.title = newTitle;
    project.updatedAt = new Date().toISOString();
    saveProjectsIndex(projects);
    return { success: true };
  });

  ipcMain.handle("delete-project", (_event, id: string) => {
    const projects = getProjectsIndex();
    const updated = projects.filter((p) => p.id !== id);
    saveProjectsIndex(updated);

    const htmlPath = path.join(projectsDir, `${id}.html`);
    const pngPath = path.join(projectsDir, `${id}.png`);
    const assetsDir = path.join(projectsDir, `${id}.assets`);
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
    if (fs.existsSync(assetsDir)) fs.rmSync(assetsDir, { recursive: true, force: true });

    const historyPath = path.join(projectsDir, `${id}.history.json`);
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
    let idx = 0;
    while (fs.existsSync(path.join(projectsDir, `${id}.snap.${idx}.html`))) {
      fs.unlinkSync(path.join(projectsDir, `${id}.snap.${idx}.html`));
      idx++;
    }

    return { success: true };
  });

  ipcMain.handle("get-project-thumbnail", (_event, id: string) => {
    const pngPath = path.join(projectsDir, `${id}.png`);
    if (!fs.existsSync(pngPath)) return null;
    const base64 = fs.readFileSync(pngPath, "base64");
    return `data:image/png;base64,${base64}`;
  });
}
