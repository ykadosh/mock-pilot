import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { net } from "electron";

import { projectsDir } from "./projects";

/**
 * Download external URLs (http/https) referenced in HTML and save them as local assets.
 * Handles: <img src>, <source srcset>, CSS url() in style attributes and <style> blocks.
 * Uses Node.js fetch (no CORS restrictions).
 */
export async function downloadExternalAssets(id: string, html: string): Promise<string> {
  const assetsDir = path.join(projectsDir, `${id}.assets`);
  // Cache URL → relative path to avoid re-downloading the same resource
  const urlCache = new Map<string, string>();

  async function downloadAndSave(url: string): Promise<string | null> {
    const cached = urlCache.get(url);
    if (cached) return cached;

    try {
      const res = await net.fetch(url);
      if (!res.ok) return null;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) return null;

      // Determine extension from Content-Type header or URL
      const contentType = res.headers.get("content-type") || "";
      const mimeBase = contentType.split(";")[0].trim().toLowerCase();
      const extFromMime: Record<string, string> = {
        "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
        "image/gif": "gif", "image/svg+xml": "svg", "image/webp": "webp",
        "image/avif": "avif", "image/bmp": "bmp", "image/x-icon": "ico",
        "image/vnd.microsoft.icon": "ico",
      };
      let ext = extFromMime[mimeBase];
      if (!ext) {
        // Try to get extension from URL path (ignore query params)
        const urlPath = new URL(url).pathname;
        const urlExt = urlPath.split(".").pop()?.toLowerCase();
        if (urlExt && /^(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/.test(urlExt)) {
          ext = urlExt === "jpeg" ? "jpg" : urlExt;
        } else {
          ext = "png"; // Default fallback for images
        }
      }

      const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
      const filename = `${hash}.${ext}`;
      const relativePath = `${id}.assets/${filename}`;

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const filePath = path.join(assetsDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }

      urlCache.set(url, relativePath);
      return relativePath;
    } catch {
      return null;
    }
  }

  // Download external images in <img src="https://...">
  const imgSrcRegex = /(<img\b[^>]*\bsrc\s*=\s*")(https?:\/\/[^"]+)(")/gi;
  const imgMatches = [...html.matchAll(imgSrcRegex)];
  for (const match of imgMatches) {
    const url = match[2].replace(/&amp;/g, "&");
    const localPath = await downloadAndSave(url);
    if (localPath) {
      html = html.replace(match[0], `${match[1]}${localPath}${match[3]}`);
    }
  }

  // Remove srcset from <img> tags that now have local src
  html = html.replace(
    /<img\b[^>]*>/gi,
    (imgTag) => {
      if (/\bsrc\s*=\s*"[^"]*\.assets\//.test(imgTag) && /\bsrcset\s*=/.test(imgTag)) {
        return imgTag.replace(/\s*srcset\s*=\s*"[^"]*"/gi, "");
      }
      return imgTag;
    }
  );

  // Download external images in <source srcset="https://...">
  const srcsetRegex = /(<source\b[^>]*\bsrcset\s*=\s*")(https?:\/\/[^"]+)(")/gi;
  const srcsetMatches = [...html.matchAll(srcsetRegex)];
  for (const match of srcsetMatches) {
    const srcsetValue = match[2].replace(/&amp;/g, "&");
    // srcset can have multiple entries: "url1 1x, url2 2x"
    const entries = srcsetValue.split(",").map((s) => s.trim());
    const newEntries: string[] = [];
    for (const entry of entries) {
      const parts = entry.split(/\s+/);
      const url = parts[0];
      const descriptor = parts.slice(1).join(" ");
      const localPath = await downloadAndSave(url);
      if (localPath) {
        newEntries.push(descriptor ? `${localPath} ${descriptor}` : localPath);
      } else {
        newEntries.push(entry);
      }
    }
    html = html.replace(match[0], `${match[1]}${newEntries.join(", ")}${match[3]}`);
  }

  // Download external images in CSS url("https://...") — inline styles and <style> blocks
  const cssUrlRegex = /url\(\s*["']?(https?:\/\/[^"')]+?)["']?\s*\)/gi;
  const cssMatches = [...html.matchAll(cssUrlRegex)];
  for (const match of cssMatches) {
    const url = match[1].replace(/&amp;/g, "&");
    // Only download image-like URLs (skip scripts, API calls, etc.)
    if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)(\?|$)/i.test(url) || /\/is\/image\//i.test(url) || /\/is\/content\//i.test(url)) {
      const localPath = await downloadAndSave(url);
      if (localPath) {
        html = html.replace(match[0], `url("${localPath}")`);
      }
    }
  }

  return html;
}
