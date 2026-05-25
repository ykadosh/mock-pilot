import { app } from "electron";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export const projectsDir = path.join(app.getPath("userData"), "projects");
export const appSettingsPath = path.join(app.getPath("userData"), "app-settings.json");

export function ensureProjectsDir() {
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
}

export function ensureProjectDir(id: string) {
  const dir = path.join(projectsDir, id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getProjectDir(id: string) {
  return path.join(projectsDir, id);
}

export function getDirSize(dirPath: string): number {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

export interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export function getProjectsIndex(): ProjectMeta[] {
  const indexPath = path.join(projectsDir, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch {
    return [];
  }
}

export function saveProjectsIndex(projects: ProjectMeta[]) {
  fs.writeFileSync(path.join(projectsDir, "index.json"), JSON.stringify(projects, null, 2));
}

export function duplicateProject(id: string): { success: boolean; project?: ProjectMeta; error?: string } {
  const projects = getProjectsIndex();
  const source = projects.find((entry) => entry.id === id);
  if (!source) return { success: false, error: "Project not found" };
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const newMeta: ProjectMeta = { id: newId, title: `${source.title} (Copy)`, url: source.url, createdAt: now, updatedAt: now };
  const sourceDir = getProjectDir(id);
  const destDir = getProjectDir(newId);
  ensureProjectDir(newId);
  if (fs.existsSync(sourceDir)) {
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      const srcPath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  projects.unshift(newMeta);
  saveProjectsIndex(projects);
  return { success: true, project: newMeta };
}

function migrateProject(id: string) {
  const projectDir = path.join(projectsDir, id);
  if (fs.existsSync(projectDir)) return;

  const htmlPath = path.join(projectsDir, `${id}.html`);
  if (!fs.existsSync(htmlPath)) return;

  fs.mkdirSync(projectDir, { recursive: true });
  fs.renameSync(htmlPath, path.join(projectDir, "project.html"));

  const filesToMove: [string, string][] = [
    [`${id}.png`, "thumbnail.png"],
    [`${id}.assets.json`, "assets.json"],
    [`${id}.history.json`, "history.json"],
  ];
  for (const [src, dest] of filesToMove) {
    const srcPath = path.join(projectsDir, src);
    if (fs.existsSync(srcPath)) fs.renameSync(srcPath, path.join(projectDir, dest));
  }

  let snapIndex = 0;
  while (fs.existsSync(path.join(projectsDir, `${id}.snap.${snapIndex}.html`))) {
    fs.renameSync(path.join(projectsDir, `${id}.snap.${snapIndex}.html`), path.join(projectDir, `snap.${snapIndex}.html`));
    snapIndex++;
  }

  const assetsFolderPath = path.join(projectsDir, `${id}.assets`);
  if (fs.existsSync(assetsFolderPath)) fs.renameSync(assetsFolderPath, path.join(projectDir, "assets"));

  const rewriteAssetRefs = (filePath: string) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, "utf-8");
    content = content.split(`${id}.assets/`).join("assets/");
    fs.writeFileSync(filePath, content, "utf-8");
  };

  rewriteAssetRefs(path.join(projectDir, "project.html"));
  snapIndex = 0;
  while (fs.existsSync(path.join(projectDir, `snap.${snapIndex}.html`))) {
    rewriteAssetRefs(path.join(projectDir, `snap.${snapIndex}.html`));
    snapIndex++;
  }
}

// Migrate flat project files into per-project folders
export function migrateProjectsToFolders() {
  for (const project of getProjectsIndex()) {
    migrateProject(project.id);
  }
}
