import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { net } from "electron";

import { projectsDir } from "./projects";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif",
  "image/svg+xml": "svg", "image/webp": "webp", "image/avif": "avif", "image/bmp": "bmp",
  "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
};
const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)(\?|$)/i;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeAssetUrl(url: string): string {
  return url.replace(/&amp;/g, "&");
}

function getExtensionFromResponse(contentType: string, url: string): string {
  const mimeBase = contentType.split(";")[0].trim().toLowerCase();
  if (IMAGE_EXTENSIONS[mimeBase]) return IMAGE_EXTENSIONS[mimeBase];

  try {
    const urlExt = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (/^(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/.test(urlExt)) return urlExt === "jpeg" ? "jpg" : urlExt;
  } catch {
    return "png";
  }
  return "png";
}

function createDownloader(id: string, assetsDir: string): (url: string) => Promise<string | null> {
  const urlCache = new Map<string, string>();
  return async function downloadAndSave(url: string): Promise<string | null> {
    const cached = urlCache.get(url);
    if (cached) return cached;

    try {
      const res = await net.fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) return null;

      const ext = getExtensionFromResponse(res.headers.get("content-type") || "", url);
      const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
      const filename = `${hash}.${ext}`;
      const relativePath = `${id}.assets/${filename}`;
      const filePath = path.join(assetsDir, filename);

      ensureDir(assetsDir);
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
      urlCache.set(url, relativePath);
      return relativePath;
    } catch {
      return null;
    }
  };
}

function removeLocalImgSrcsets(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (imgTag) =>
    /\bsrc\s*=\s*"[^"]*\.assets\//.test(imgTag) && /\bsrcset\s*=/.test(imgTag)
      ? imgTag.replace(/\s*srcset\s*=\s*"[^"]*"/gi, "")
      : imgTag);
}

async function downloadImgSrcs(html: string, downloadAndSave: (url: string) => Promise<string | null>): Promise<string> {
  for (const match of html.matchAll(/(<img\b[^>]*\bsrc\s*=\s*")(https?:\/\/[^"]+)(")/gi)) {
    const localPath = await downloadAndSave(normalizeAssetUrl(match[2]));
    if (localPath) html = html.replace(match[0], `${match[1]}${localPath}${match[3]}`);
  }
  return html;
}

async function downloadSourceSrcsets(html: string, downloadAndSave: (url: string) => Promise<string | null>): Promise<string> {
  for (const match of html.matchAll(/(<source\b[^>]*\bsrcset\s*=\s*")(https?:\/\/[^"]+)(")/gi)) {
    const newEntries: string[] = [];
    for (const entry of normalizeAssetUrl(match[2]).split(",").map((item) => item.trim())) {
      const [url, ...descriptor] = entry.split(/\s+/);
      const localPath = await downloadAndSave(url);
      newEntries.push(localPath ? [localPath, ...descriptor].join(" ") : entry);
    }
    html = html.replace(match[0], `${match[1]}${newEntries.join(", ")}${match[3]}`);
  }
  return html;
}

async function downloadCssUrls(html: string, downloadAndSave: (url: string) => Promise<string | null>): Promise<string> {
  for (const match of html.matchAll(/url\(\s*(?:["']|&quot;)?(https?:\/\/[^"')&]+?)(?:["']|&quot;)?\s*\)/gi)) {
    const url = normalizeAssetUrl(match[1]);
    if (!IMAGE_URL_PATTERN.test(url) && !/\/is\/(?:image|content)\//i.test(url)) continue;
    const localPath = await downloadAndSave(url);
    if (localPath) html = html.replace(match[0], `url("${localPath}")`);
  }
  return html;
}

export async function downloadExternalAssets(id: string, html: string): Promise<string> {
  const assetsDir = path.join(projectsDir, `${id}.assets`);
  const downloadAndSave = createDownloader(id, assetsDir);

  html = await downloadImgSrcs(html, downloadAndSave);
  html = removeLocalImgSrcsets(html);
  html = await downloadSourceSrcsets(html, downloadAndSave);
  return downloadCssUrls(html, downloadAndSave);
}
