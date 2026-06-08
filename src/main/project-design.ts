import path from "path";
import fs from "fs";

import { ensureProjectDir, getProjectDir } from "./projects";

export function getProjectDesignPath(id: string) {
  return path.join(getProjectDir(id), "design.md");
}

function getProjectDesignMetaPath(id: string) {
  return path.join(getProjectDir(id), "design-meta.json");
}

export function isProjectDesignEnabled(id: string): boolean {
  const metaPath = getProjectDesignMetaPath(id);
  if (!fs.existsSync(metaPath)) return true;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { enabled?: boolean };
    return meta.enabled !== false;
  } catch {
    return true;
  }
}

export function setProjectDesignEnabled(id: string, enabled: boolean) {
  ensureProjectDir(id);
  fs.writeFileSync(getProjectDesignMetaPath(id), JSON.stringify({ enabled }, null, 2), "utf-8");
}

export function readProjectDesign(id: string): string | null {
  if (!isProjectDesignEnabled(id)) return null;
  const designPath = getProjectDesignPath(id);
  if (!fs.existsSync(designPath)) return null;
  try {
    const content = fs.readFileSync(designPath, "utf-8");
    return content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
}

export function readProjectDesignRaw(id: string): string | null {
  const designPath = getProjectDesignPath(id);
  if (!fs.existsSync(designPath)) return null;
  try {
    const content = fs.readFileSync(designPath, "utf-8");
    return content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
}

export function writeProjectDesign(id: string, content: string) {
  ensureProjectDir(id);
  fs.writeFileSync(getProjectDesignPath(id), content, "utf-8");
}

export function deleteProjectDesign(id: string) {
  const designPath = getProjectDesignPath(id);
  if (fs.existsSync(designPath)) fs.unlinkSync(designPath);
}
