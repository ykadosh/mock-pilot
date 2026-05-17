import { app, BrowserWindow, dialog, ipcMain, protocol, net, shell, webContents } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pathToFileURL } from "url";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { html_beautify } = require("js-beautify");

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// GitHub OAuth Device Flow
// Using a public OAuth App client ID for device flow (no secret needed)
const GITHUB_CLIENT_ID = "Ov23liwdxHGMy1H6hPRx";

const authFilePath = path.join(app.getPath("userData"), "github-auth.json");
const loggedOutMarker = path.join(app.getPath("userData"), "github-logged-out");

// Packaged Electron apps don't inherit the user's shell PATH,
// so we augment it with common install locations for CLI tools like `gh`.
const shellEnv = {
  ...process.env,
  PATH: `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.HOME || ""}/.local/bin`,
};

interface AuthData {
  token: string;
  login: string;
  avatar_url?: string;
}

function loadAuth(): AuthData | null {
  try {
    if (fs.existsSync(authFilePath)) {
      return JSON.parse(fs.readFileSync(authFilePath, "utf-8"));
    }
  } catch { /* ignore */ }
  return null;
}

function saveAuth(data: AuthData) {
  fs.writeFileSync(authFilePath, JSON.stringify(data), "utf-8");
  // Clear logged-out marker when explicitly saving auth
  try { fs.unlinkSync(loggedOutMarker); } catch { /* ignore */ }
}

function clearAuth() {
  try { fs.unlinkSync(authFilePath); } catch { /* ignore */ }
  // Set logged-out marker so we don't re-import from gh CLI
  fs.writeFileSync(loggedOutMarker, "", "utf-8");
}

function isExplicitlyLoggedOut(): boolean {
  return fs.existsSync(loggedOutMarker);
}

function getToken(): string | null {
  const auth = loadAuth();
  if (auth?.token) return auth.token;
  if (isExplicitlyLoggedOut()) return null;
  // Fallback: try gh CLI if available
  try {
    const { execSync } = require("child_process");
    const token = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
    if (token) return token;
  } catch { /* gh not available */ }
  return null;
}

// Copilot token cache
let copilotTokenCache: { token: string; expiresAt: number } | null = null;

// Exchange a GitHub token for a Copilot session token
async function exchangeCopilotToken(githubToken: string): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (copilotTokenCache && Date.now() < copilotTokenCache.expiresAt - 60000) {
    return copilotTokenCache.token;
  }
  try {
    const response = await fetch("https://api.github.com/copilot_internal/v2/token", {
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot/1.300.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json() as { token?: string; expires_at?: number };
    if (data.token) {
      copilotTokenCache = {
        token: data.token,
        expiresAt: (data.expires_at || 0) * 1000, // convert unix seconds to ms
      };
      return data.token;
    }
  } catch { /* exchange failed */ }
  return null;
}

// Get a token suitable for Copilot API calls
async function getCopilotToken(): Promise<string | null> {
  // First try: exchange stored OAuth token for Copilot token
  const auth = loadAuth();
  if (auth?.token) {
    const copilotToken = await exchangeCopilotToken(auth.token);
    if (copilotToken) return copilotToken;
  }
  // Second try: use gh CLI token directly (has Copilot access built-in)
  try {
    const { execSync } = require("child_process");
    const ghToken = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
    if (ghToken) {
      // Try exchanging gh CLI token too
      const copilotToken = await exchangeCopilotToken(ghToken);
      if (copilotToken) return copilotToken;
      // gh CLI token might work directly
      return ghToken;
    }
  } catch { /* gh not available */ }
  return null;
}

// Projects storage
const projectsDir = path.join(app.getPath("userData"), "projects");
const appSettingsPath = path.join(app.getPath("userData"), "app-settings.json");

function ensureProjectsDir() {
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
}

function getDirSize(dirPath: string): number {
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

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

function getProjectsIndex(): ProjectMeta[] {
  const indexPath = path.join(projectsDir, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch {
    return [];
  }
}

function saveProjectsIndex(projects: ProjectMeta[]) {
  fs.writeFileSync(path.join(projectsDir, "index.json"), JSON.stringify(projects, null, 2));
}

/**
 * Extract base64 data URIs from HTML and save them as files in a per-project assets folder.
 * - Extracts base64 images from <img src="data:..."> attributes
 * - Extracts base64 fonts/images from CSS url("data:...") references
 * - Saves each unique asset as {hash}.{ext} in {id}.assets/
 * - Replaces data URIs in the HTML with relative paths (assets/{hash}.{ext})
 * Returns the modified HTML.
 */
function extractAndSaveAssets(id: string, html: string): string {
  const assetsDir = path.join(projectsDir, `${id}.assets`);

  // Map of data URI → relative path (for deduplication)
  const assetMap = new Map<string, string>();

  function saveAsset(dataUri: string): string {
    // Check dedup cache
    const cached = assetMap.get(dataUri);
    if (cached) return cached;

    // Parse the data URI: data:[<mediatype>][;base64],<data>
    const match = dataUri.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
    if (!match) return dataUri; // Can't parse, leave as-is

    const mimeType = match[1];
    const base64Data = match[2];

    // Determine file extension from MIME type
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/bmp": "bmp",
      "image/x-icon": "ico",
      "image/vnd.microsoft.icon": "ico",
      "font/woff": "woff",
      "font/woff2": "woff2",
      "application/font-woff": "woff",
      "application/font-woff2": "woff2",
      "font/ttf": "ttf",
      "font/otf": "otf",
      "application/x-font-ttf": "ttf",
      "application/x-font-opentype": "otf",
      "font/opentype": "otf",
      "application/vnd.ms-fontobject": "eot",
    };
    const ext = extMap[mimeType] || mimeType.split("/")[1] || "bin";

    // Compute content hash for deduplication and filename
    const hash = crypto.createHash("sha256").update(base64Data).digest("hex").slice(0, 12);
    const filename = `${hash}.${ext}`;
    const relativePath = `${id}.assets/${filename}`;

    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Write the file (skip if already exists — same content hash)
    const filePath = path.join(assetsDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, base64Data, "base64");
    }

    assetMap.set(dataUri, relativePath);
    return relativePath;
  }

  // Extract base64 images from img src attributes
  // Matches: src="data:image/...;base64,..."
  html = html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*")([^"]*data:[^"]+;base64,[^"]+)(")/gi,
    (_match, prefix, dataUri, suffix) => {
      const relativePath = saveAsset(dataUri);
      return `${prefix}${relativePath}${suffix}`;
    }
  );

  // Remove srcset attributes from img tags that now use local asset paths
  // (srcset would point to stale external URLs and override the local src)
  html = html.replace(
    /<img\b[^>]*>/gi,
    (imgTag) => {
      if (/\bsrc\s*=\s*"[^"]*\.assets\//.test(imgTag) && /\bsrcset\s*=/.test(imgTag)) {
        return imgTag.replace(/\s*srcset\s*=\s*"[^"]*"/gi, "");
      }
      return imgTag;
    }
  );

  // Extract base64 data URIs from CSS url() — fonts and background images
  // Matches: url("data:...;base64,...") or url(data:...;base64,...)
  html = html.replace(
    /url\(\s*["']?(data:[^"')]+;base64,[^"')]+)["']?\s*\)/gi,
    (_match, dataUri) => {
      const relativePath = saveAsset(dataUri);
      return `url("${relativePath}")`;
    }
  );

  // Extract base64 data URIs from srcset attributes (inside <source> and <img> tags)
  html = html.replace(
    /(\bsrcset\s*=\s*")((?:[^"]*data:[^"]+;base64,[^"]+)+)(")/gi,
    (_match, prefix, srcsetValue, suffix) => {
      const newSrcset = srcsetValue.replace(
        /(data:[^,]+;base64,[^\s,"]+)/g,
        (dataUri: string) => saveAsset(dataUri)
      );
      return `${prefix}${newSrcset}${suffix}`;
    }
  );

  return html;
}

/**
 * Download external URLs (http/https) referenced in HTML and save them as local assets.
 * Handles: <img src>, <source srcset>, CSS url() in style attributes and <style> blocks.
 * Uses Node.js fetch (no CORS restrictions).
 */
async function downloadExternalAssets(id: string, html: string): Promise<string> {
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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

// Register custom protocol scheme for serving project assets
protocol.registerSchemesAsPrivileged([
  { scheme: "mp-asset", privileges: { bypassCSP: true, supportFetchAPI: true, stream: true, corsEnabled: true, standard: true } }
]);

app.on("ready", () => {
  ensureProjectsDir();

  // Handle mp-asset:// protocol requests to serve local asset files
  protocol.handle("mp-asset", (request) => {
    // URL format: mp-asset://assets/{projectId}.assets/{filename}
    const url = new URL(request.url);
    const filePath = path.join(projectsDir, decodeURIComponent(url.pathname.replace(/^\//, "")));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  // List all projects
  ipcMain.handle("list-projects", () => {
    return getProjectsIndex();
  });

  // Save a new project
  ipcMain.handle("save-project", async (_event, data: { url: string; title: string; html: string; thumbnail?: string }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };

    // Extract base64 assets and save HTML file
    let processedHtml = extractAndSaveAssets(id, data.html);
    // Download any remaining external images/assets from the original website
    processedHtml = await downloadExternalAssets(id, processedHtml);
    fs.writeFileSync(path.join(projectsDir, `${id}.html`), processedHtml, "utf-8");

    // Save thumbnail if provided
    if (data.thumbnail) {
      const base64Data = data.thumbnail.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(projectsDir, `${id}.png`), base64Data, "base64");
    }

    // Update index
    const projects = getProjectsIndex();
    projects.unshift(meta);
    saveProjectsIndex(projects);

    return meta;
  });

  // Load a project's HTML
  ipcMain.handle("load-project", (_event, id: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false, error: "Project not found" };
    const html = fs.readFileSync(htmlPath, "utf-8");
    // Provide the base path so the renderer can resolve relative asset paths
    const assetsBasePath = "mp-asset://assets/";
    return { success: true, html, assetsBasePath };
  });

  // Update a project's HTML (persist modifications)
  ipcMain.handle("update-project-html", (_event, id: string, html: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false };
    // Extract any new base64 assets introduced by AI modifications
    const processedHtml = extractAndSaveAssets(id, html);
    fs.writeFileSync(htmlPath, processedHtml, "utf-8");
    // Update timestamp in index
    const projects = getProjectsIndex();
    const project = projects.find((p) => p.id === id);
    if (project) {
      project.updatedAt = new Date().toISOString();
      saveProjectsIndex(projects);
    }
    return { success: true };
  });

  // Save project history
  ipcMain.handle("save-project-history", (_event, id: string, data: { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] }) => {
    try {
      // Save metadata (labels, timestamps, pointer)
      const metaPath = path.join(projectsDir, `${id}.history.json`);
      fs.writeFileSync(metaPath, JSON.stringify({ entries: data.entries, pointer: data.pointer }), "utf-8");
      // Save each HTML snapshot (extract base64 assets to shared folder)
      for (let i = 0; i < data.htmlSnapshots.length; i++) {
        const processedHtml = extractAndSaveAssets(id, data.htmlSnapshots[i]);
        fs.writeFileSync(path.join(projectsDir, `${id}.snap.${i}.html`), processedHtml, "utf-8");
      }
      // Clean up old snapshots beyond current count
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

  // Load project history
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

  // Rename a project
  ipcMain.handle("rename-project", (_event, id: string, newTitle: string) => {
    const projects = getProjectsIndex();
    const project = projects.find((p) => p.id === id);
    if (!project) return { success: false };
    project.title = newTitle;
    project.updatedAt = new Date().toISOString();
    saveProjectsIndex(projects);
    return { success: true };
  });

  // Delete a project
  ipcMain.handle("delete-project", (_event, id: string) => {
    const projects = getProjectsIndex();
    const updated = projects.filter((p) => p.id !== id);
    saveProjectsIndex(updated);

    // Remove files
    const htmlPath = path.join(projectsDir, `${id}.html`);
    const pngPath = path.join(projectsDir, `${id}.png`);
    const assetsDir = path.join(projectsDir, `${id}.assets`);
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
    if (fs.existsSync(assetsDir)) fs.rmSync(assetsDir, { recursive: true, force: true });

    // Remove history files
    const historyPath = path.join(projectsDir, `${id}.history.json`);
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
    let idx = 0;
    while (fs.existsSync(path.join(projectsDir, `${id}.snap.${idx}.html`))) {
      fs.unlinkSync(path.join(projectsDir, `${id}.snap.${idx}.html`));
      idx++;
    }

    return { success: true };
  });

  // Get project thumbnail
  ipcMain.handle("get-project-thumbnail", (_event, id: string) => {
    const pngPath = path.join(projectsDir, `${id}.png`);
    if (!fs.existsSync(pngPath)) return null;
    const base64 = fs.readFileSync(pngPath, "base64");
    return `data:image/png;base64,${base64}`;
  });

  // Register IPC handlers before creating window
  ipcMain.handle("capture-website", async (_event, url: string) => {
    try {
      // Use require to avoid Vite bundling puppeteer
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      // The inline capture logic injected into page.evaluate() calls.
      // It inlines stylesheets, fonts, images, removes scripts, and cleans up the DOM.
      const inlineCaptureScript = async () => {
        // Helper: resolve and inline font URLs in CSS text relative to a base URL
        async function inlineFontUrls(cssText: string, baseUrl: string): Promise<string> {
          const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
          const fontFaces = [...cssText.matchAll(fontFaceRegex)];
          for (const faceMatch of fontFaces) {
            let faceBlock = faceMatch[0];
            const urlRegex = /url\(["']?([^"')]+?)["']?\)\s*format\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\)/gi;
            const urlMatches = [...faceBlock.matchAll(urlRegex)];
            for (const match of urlMatches) {
              const fontUrl = match[1];
              if (fontUrl.startsWith("data:")) continue;
              try {
                const resolvedUrl = new URL(fontUrl, baseUrl).href;
                const res = await fetch(resolvedUrl);
                if (res.ok) {
                  const blob = await res.blob();
                  const dataUri = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  faceBlock = faceBlock.replace(match[0], `url("${dataUri}") format("${match[2]}")`);
                }
              } catch {
                // Skip fonts that can't be fetched
              }
            }
            // Also try URLs without format() hint
            const simpleUrlRegex = /url\(["']?([^"')]+\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\)/gi;
            const simpleMatches = [...faceBlock.matchAll(simpleUrlRegex)];
            for (const match of simpleMatches) {
              const fontUrl = match[1];
              if (fontUrl.startsWith("data:")) continue;
              try {
                const resolvedUrl = new URL(fontUrl, baseUrl).href;
                const res = await fetch(resolvedUrl);
                if (res.ok) {
                  const blob = await res.blob();
                  const dataUri = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  faceBlock = faceBlock.replace(match[0], `url("${dataUri}")`);
                }
              } catch {
                // Skip fonts that can't be fetched
              }
            }
            cssText = cssText.replace(faceMatch[0], faceBlock);
          }
          return cssText;
        }

        // Inline external stylesheets (resolve font URLs relative to stylesheet origin)
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        for (const link of stylesheets) {
          try {
            const href = (link as HTMLLinkElement).href;
            const res = await fetch(href);
            let css = await res.text();
            css = await inlineFontUrls(css, href);
            const style = document.createElement("style");
            style.textContent = css;
            link.replaceWith(style);
          } catch {
            // Skip failed stylesheets
          }
        }

        // Also process any pre-existing <style> tags (resolve relative to document)
        const inlineStyles = document.querySelectorAll("style");
        for (const style of inlineStyles) {
          style.textContent = await inlineFontUrls(style.textContent || "", document.baseURI);
        }

        // Convert same-origin images to data URIs (cross-origin will be handled server-side)
        const images = document.querySelectorAll("img");
        for (const img of images) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 200;
            const ctx = canvas.getContext("2d");
            if (ctx && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, 0, 0);
              img.src = canvas.toDataURL("image/png");
            }
          } catch {
            // CORS images will be downloaded server-side after capture
          }
        }

        // Remove scripts
        document.querySelectorAll("script").forEach((s) => s.remove());

        // Remove HTML comments
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
        const comments: Comment[] = [];
        while (walker.nextNode()) comments.push(walker.currentNode as Comment);
        comments.forEach((c) => c.remove());

        // Remove hidden elements and empty attributes
        document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => el.remove());

        // Collapse whitespace-only text nodes (but not inside <pre> elements where whitespace matters)
        const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (textWalker.nextNode()) textNodes.push(textWalker.currentNode as Text);
        textNodes.forEach((t) => {
          if (t.textContent && /^\s+$/.test(t.textContent)) {
            // Check if this text node is inside a <pre> element
            let ancestor = t.parentElement;
            while (ancestor) {
              if (ancestor.tagName === "PRE") return;
              ancestor = ancestor.parentElement;
            }
            t.textContent = "\n";
          }
        });

        return document.documentElement.outerHTML;
      };

      /**
       * Recursively capture iframe content and inline it into the parent page.
       * Opens a new page for each iframe src, runs the full capture pipeline,
       * and replaces the iframe element with a scoped static div.
       */
      async function captureIframesRecursively(
        page: InstanceType<typeof puppeteer.prototype.constructor>,
        browser: InstanceType<typeof puppeteer.prototype.constructor>,
        depth: number = 0,
        maxDepth: number = 3,
        iframeTimeout: number = 30000
      ): Promise<void> {
        if (depth >= maxDepth) return;

        // Get all iframe src URLs from the current page
        const iframeData = await page.evaluate(() => {
          const iframes = document.querySelectorAll("iframe");
          const data: { src: string; index: number }[] = [];
          iframes.forEach((iframe, index) => {
            const src = iframe.getAttribute("src") || iframe.src;
            if (src && src !== "about:blank" && !src.startsWith("javascript:") && !src.startsWith("data:")) {
              data.push({ src, index });
            }
          });
          return data;
        });

        if (iframeData.length === 0) {
          console.log(`[Capture] No iframes found at depth ${depth}`);
          return;
        }

        console.log(`[Capture] Found ${iframeData.length} iframe(s) at depth ${depth}`);
        // Process iframes in reverse order so that replacing earlier iframes
        // doesn't shift the indices of later ones
        iframeData.reverse();
        for (const { src, index } of iframeData) {
          try {
            const resolvedUrl = await page.evaluate((s: string) => {
              try { return new URL(s, document.baseURI).href; } catch { return s; }
            }, src);

            console.log(`[Capture] Processing iframe ${index}: ${resolvedUrl.substring(0, 80)}`);

            // Open a new page for this iframe's content
            const iframePage = await browser.newPage();
            try {
              await iframePage.setViewport({ width: 1280, height: 800 });
              await iframePage.goto(resolvedUrl, { waitUntil: "networkidle2", timeout: iframeTimeout });
              iframePage.setDefaultTimeout(iframeTimeout);

              // Recursively process any nested iframes first
              await captureIframesRecursively(iframePage, browser, depth + 1, maxDepth, iframeTimeout);

              // Capture the iframe page content
              const iframeHtml = await iframePage.evaluate(inlineCaptureScript);

              // Inject the captured content back into the parent page, replacing the iframe
              const scopeId = `iframe-inline-${depth}-${index}`;
              await page.evaluate((params: { iframeIndex: number; capturedHtml: string; scopeId: string }) => {
                const iframes = document.querySelectorAll("iframe");
                const iframe = iframes[params.iframeIndex];
                if (!iframe) return;

                // Parse the captured HTML to extract body and styles
                const parser = new DOMParser();
                const doc = parser.parseFromString(params.capturedHtml, "text/html");

                // Create a scoped container
                const container = document.createElement("div");
                container.setAttribute("data-iframe-inline", params.scopeId);
                container.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");

                // Preserve iframe dimensions
                const width = iframe.getAttribute("width") || iframe.style.width || "100%";
                const height = iframe.getAttribute("height") || iframe.style.height || "auto";
                container.style.width = typeof width === "string" && width.includes("%") ? width : `${width}px`;
                container.style.height = height === "auto" ? "auto" : (typeof height === "string" && height.includes("%") ? height : `${height}px`);
                container.style.overflow = "hidden";
                container.style.position = "relative";

                // Scope all styles from the iframe to prevent bleed
                const iframeStyles = doc.querySelectorAll("style");
                const scopeSelector = `[data-iframe-inline="${params.scopeId}"]`;
                for (const style of iframeStyles) {
                  let css = style.textContent || "";
                  // Prefix each CSS rule with the scope selector
                  css = css.replace(
                    /([^{}]+)\{/g,
                    (match, selectors: string) => {
                      // Don't scope @-rules (media queries, keyframes, font-face, etc.)
                      if (selectors.trim().startsWith("@")) return match;
                      const scopedSelectors = selectors.split(",").map((sel: string) => {
                        const trimmed = sel.trim();
                        if (!trimmed) return sel;
                        // Replace html/body selectors with the container itself
                        if (trimmed === "html" || trimmed === "body" || trimmed === ":root") {
                          return `${scopeSelector}`;
                        }
                        return `${scopeSelector} ${trimmed}`;
                      }).join(",");
                      return `${scopedSelectors}{`;
                    }
                  );
                  const scopedStyle = document.createElement("style");
                  scopedStyle.textContent = css;
                  container.appendChild(scopedStyle);
                }

                // Copy body content
                const bodyContent = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
                const contentWrapper = document.createElement("div");
                contentWrapper.innerHTML = bodyContent;
                container.appendChild(contentWrapper);

                // Replace the iframe with our container
                iframe.replaceWith(container);
              }, { iframeIndex: index, capturedHtml: iframeHtml, scopeId });
            } catch (iframeErr) {
              // On failure, replace iframe with a placeholder
              console.error(`[Capture] Failed to capture iframe ${index} (${src}):`, iframeErr instanceof Error ? iframeErr.message : iframeErr);
              try {
                await page.evaluate((iframeIndex: number) => {
                  const iframes = document.querySelectorAll("iframe");
                  const iframe = iframes[iframeIndex];
                  if (!iframe) return;
                  const placeholder = document.createElement("div");
                  placeholder.setAttribute("data-iframe-failed", "true");
                  placeholder.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");
                  placeholder.style.border = "1px dashed #ccc";
                  placeholder.style.padding = "1em";
                  placeholder.style.textAlign = "center";
                  placeholder.style.color = "#999";
                  placeholder.textContent = `[iframe content could not be captured: ${iframe.getAttribute("src") || "unknown"}]`;
                  iframe.replaceWith(placeholder);
                }, index);
              } catch { /* placeholder insertion failed too */ }
            } finally {
              await iframePage.close();
            }
          } catch (outerErr) {
            console.error(`[Capture] Skipping iframe (${src}):`, outerErr instanceof Error ? outerErr.message : outerErr);
          }
        }
      }

      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Increase timeout for evaluate since font inlining can take time
        page.setDefaultTimeout(60000);

        // Recursively capture and inline all iframes before processing the main page
        await captureIframesRecursively(page, browser);

        const html = await page.evaluate(inlineCaptureScript);

        // Get the page title before closing
        const pageTitle = await page.title();

        // Take screenshot for thumbnail
        const screenshot = await page.screenshot({ type: "png", encoding: "base64" });

        // Format the HTML with proper indentation
        const formattedHtml = html_beautify(html, {
          indent_size: 2,
          indent_char: " ",
          max_preserve_newlines: 1,
          preserve_newlines: true,
          wrap_line_length: 0,
          end_with_newline: true,
          indent_inner_html: true,
          css_indent_size: 2,
          content_unformatted: ["pre", "code", "textarea"],
        });

        return { success: true, html: `<!DOCTYPE html>\n${formattedHtml}`, thumbnail: `data:image/png;base64,${screenshot}`, title: pageTitle || undefined };
      } finally {
        await browser.close();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Format raw HTML with js-beautify (used by capture browser)
  ipcMain.handle("get-webview-preload-path", () => {
    return path.join(__dirname, "webviewPreload.js");
  });

  ipcMain.handle("capture-log", (_event, ...args: unknown[]) => {
    console.log("[Capture]", ...args);
  });

  // Capture all iframe content from an already-loaded webview using Electron's webFrameMain API.
  // This avoids Puppeteer and bot detection since the iframes are already loaded in the webview.
  ipcMain.handle("capture-webview-iframes", async (_event, webContentsId: number) => {
    try {
      const wc = webContents.fromId(webContentsId);
      if (!wc) return { success: false, error: "WebContents not found" };

      // Use Chrome DevTools Protocol to enumerate all frames and capture their content.
      // webFrameMain.frames is unreliable for cross-origin redirected frames (URL stays empty).
      const frameLog: string[] = [];

      // First, still collect webFrameMain frames for capturing
      let allFrames: Electron.WebFrameMain[] = [];
      const collectFrames = (frame: Electron.WebFrameMain) => {
        for (const child of frame.frames) {
          allFrames.push(child);
          collectFrames(child);
        }
      };
      try {
        collectFrames(wc.mainFrame);
      } catch {}

      // Also use CDP to get the real frame tree (shows actual URLs after redirects)
      let cdpFrames: { frameId: string; url: string; name: string; parentId?: string }[] = [];
      try {
        wc.debugger.attach("1.3");
        const result = await wc.debugger.sendCommand("Page.getFrameTree");
        const extractFrames = (node: { frame: { id: string; url: string; name: string; parentId?: string }; childFrames?: unknown[] }) => {
          cdpFrames.push(node.frame);
          if (node.childFrames) {
            for (const child of node.childFrames as typeof node[]) {
              extractFrames(child);
            }
          }
        };
        extractFrames(result.frameTree);
        wc.debugger.detach();
      } catch (e) {
        frameLog.push(`CDP error: ${e instanceof Error ? e.message : String(e)}`);
        try { wc.debugger.detach(); } catch {}
      }

      frameLog.push(`webFrameMain frames: ${allFrames.length}`);
      frameLog.push(`CDP frames: ${cdpFrames.length}`);
      for (const cf of cdpFrames) {
        frameLog.push(`CDP frame: ${cf.url} (id=${cf.frameId}, name=${cf.name})`);
      }

      // Build a map of frame URL (from CDP) to webFrameMain object
      // CDP gives us reliable URLs; webFrameMain gives us executeJavaScript
      // Match by: frameId, or by position in the tree
      for (const frame of allFrames) {
        let realUrl = frame.url;
        if (!realUrl) {
          // Try to find this frame's real URL from CDP data
          // Match by trying executeJavaScript in the frame to get its frameId
          try { realUrl = await frame.executeJavaScript(`document.location.href`); } catch { realUrl = "(inaccessible)"; }
        }
        frameLog.push(`webFrameMain: ${frame.url} | real: ${realUrl}`);
      }

      // For frames with empty webFrameMain.url, try to match them with CDP frames
      // that have real URLs, and use executeJavaScript on them
      const framesToCapture: { frame: Electron.WebFrameMain; url: string }[] = [];
      const usedCdpUrls = new Set<string>();

      for (const frame of allFrames) {
        if (frame.url && frame.url !== "about:blank" && !frame.url.startsWith("data:") && !frame.url.startsWith("javascript:")) {
          framesToCapture.push({ frame, url: frame.url });
          usedCdpUrls.add(frame.url);
        } else {
          // Empty URL frame — try document.location.href
          let realUrl = "";
          try { realUrl = await frame.executeJavaScript(`document.location.href`); } catch {}
          if (realUrl && realUrl !== "about:blank" && !realUrl.startsWith("data:")) {
            framesToCapture.push({ frame, url: realUrl });
            usedCdpUrls.add(realUrl);
          } else {
            // Still about:blank — try to find a CDP frame that doesn't match any known frame
            // This handles cross-origin redirected frames where even location.href is wrong
            const unmatchedCdp = cdpFrames.filter(cf =>
              cf.url && cf.url !== "about:blank" && !cf.url.startsWith("data:") &&
              !usedCdpUrls.has(cf.url) &&
              // Skip the main frame
              cf.url !== wc.mainFrame.url
            );
            if (unmatchedCdp.length > 0) {
              // This frame likely corresponds to the unmatched CDP frame
              framesToCapture.push({ frame, url: unmatchedCdp[0].url });
              usedCdpUrls.add(unmatchedCdp[0].url);
              frameLog.push(`Matched empty-URL frame to CDP: ${unmatchedCdp[0].url}`);
            } else {
              frameLog.push(`Skipped: ${frame.url} (real: ${realUrl})`);
            }
          }
        }
      }

      frameLog.push(`Frames to capture: ${framesToCapture.length}`);

      if (framesToCapture.length === 0) {
        require("fs").writeFileSync("/tmp/mock-pilot-frame-debug.log", frameLog.join("\n"));
        return { success: true, iframes: [] };
      }

      const captureScript = `
        (async function() {
          // Inline external stylesheets
          var stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          for (var i = 0; i < stylesheets.length; i++) {
            try {
              var href = stylesheets[i].href;
              var controller = new AbortController();
              var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
              var res = await fetch(href, { signal: controller.signal });
              clearTimeout(timeoutId);
              var css = await res.text();
              var style = document.createElement("style");
              style.textContent = css;
              stylesheets[i].replaceWith(style);
            } catch(e) {}
          }

          // Convert images to data URIs
          var images = document.querySelectorAll("img");
          for (var j = 0; j < images.length; j++) {
            try {
              var img = images[j];
              if (!img.complete || img.naturalWidth === 0) continue;
              var canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width || 300;
              canvas.height = img.naturalHeight || img.height || 200;
              var ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                img.src = canvas.toDataURL("image/png");
                img.removeAttribute("srcset");
              }
            } catch(e) {}
          }

          // Remove scripts
          document.querySelectorAll("script").forEach(function(s) { s.remove(); });

          // Remove preload/prefetch links
          document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="modulepreload"], link[rel="icon"]').forEach(function(l) { l.remove(); });

          // Remove trust/security warning banners (e.g., CodePen's "Do not enter passwords" warning)
          document.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(el) { el.remove(); });
          document.querySelectorAll('div, section, aside, p, span').forEach(function(el) {
            if (el.textContent && el.textContent.indexOf('Do not enter passwords') >= 0 && el.textContent.indexOf('CodePen') >= 0) {
              el.remove();
            }
          });

          // Serialize CSSOM rules (captures CSS injected via insertRule)
          document.querySelectorAll("style").forEach(function(style) {
            try {
              var sheet = style.sheet;
              if (sheet && sheet.cssRules && sheet.cssRules.length > 0) {
                var rules = [];
                for (var k = 0; k < sheet.cssRules.length; k++) {
                  rules.push(sheet.cssRules[k].cssText);
                }
                var serialized = rules.join("\\n");
                if (serialized !== (style.textContent || "").trim()) {
                  style.textContent = serialized;
                }
              }
            } catch(e) {}
          });

          return document.documentElement.outerHTML;
        })()
      `;

      const results: { url: string; html: string; childIframeSrcs: string[] }[] = [];

      // Process frames in reverse order (leaf frames first) so that capturing
      // a parent frame doesn't destroy child frames before they're captured
      for (const { frame, url: frameUrl } of [...framesToCapture].reverse()) {
        try {
          // Before capture, get the iframe src URLs inside this frame
          let childIframeSrcs: string[] = [];
          try {
            childIframeSrcs = await frame.executeJavaScript(`
              (function() {
                var iframes = document.querySelectorAll("iframe");
                var srcs = [];
                for (var i = 0; i < iframes.length; i++) {
                  srcs.push(iframes[i].src || iframes[i].getAttribute("src") || "");
                }
                return srcs;
              })()
            `);
            frameLog.push(`Frame ${frameUrl.substring(0, 80)} has ${childIframeSrcs.length} child iframe(s): ${childIframeSrcs.map(s => s.substring(0, 80)).join(", ")}`);
          } catch (e) {
            frameLog.push(`Could not get child iframes for ${frameUrl.substring(0, 80)}`);
          }
          
          console.log(`[Capture] Capturing frame: ${frameUrl.substring(0, 80)}`);
          const html = await frame.executeJavaScript(captureScript);
          
          const remainingIframes = (html.match(/<iframe /g) || []).length;
          frameLog.push(`Captured: ${frameUrl} (${html.length} chars, ${remainingIframes} remaining iframes)`);
          
          results.push({ url: frameUrl, html, childIframeSrcs });
          console.log(`[Capture] Frame captured: ${html.length} chars`);
        } catch (frameErr) {
          frameLog.push(`Failed ${frameUrl}: ${frameErr instanceof Error ? frameErr.message : String(frameErr)}`);
          console.error(`[Capture] Failed to capture frame:`, frameErr instanceof Error ? frameErr.message : frameErr);
        }
      }

      // Write debug log to temp file
      require("fs").writeFileSync("/tmp/mock-pilot-frame-debug.log", frameLog.join("\n"));

      return { success: true, iframes: results };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("format-html", (_event, rawHtml: string) => {
    try {
      const formattedHtml = html_beautify(rawHtml, {
        indent_size: 2,
        indent_char: " ",
        max_preserve_newlines: 1,
        preserve_newlines: true,
        wrap_line_length: 0,
        end_with_newline: true,
        indent_inner_html: true,
        css_indent_size: 2,
        content_unformatted: ["pre", "code", "textarea"],
      });
      return { success: true, html: `<!DOCTYPE html>\n${formattedHtml}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // AI element modification
  ipcMain.handle("ai-modify-element", async (_event, data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) => {
    try {
      const token = getToken();
      if (!token) {
        return { success: false, error: "Not authenticated. Please sign in with GitHub first." };
      }

      const systemPrompt = `You are an expert front-end developer. The user has selected an HTML element and wants to modify it.
You will receive the element's current HTML and computed CSS styles.
Based on the user's instructions, return ONLY the modified HTML for that element.

Rules:
- Return only the modified outerHTML of the element, nothing else.
- Do not wrap in markdown code blocks or add any explanation.
- Preserve the overall structure but apply the requested changes.
- You may modify inline styles, classes, attributes, text content, or child elements.
- If adding styles, use inline styles (style attribute) since you don't have access to a stylesheet.
- Keep the same tag type unless the user explicitly asks to change it.
- IMPORTANT: Preserve any data-mp-id attribute exactly as-is. Do not remove or modify it.
- If the user asks to remove/delete the element, return exactly the text: __REMOVE_ELEMENT__`;

      const userMessage = `Here is the selected element's HTML:
\`\`\`html
${data.outerHTML}
\`\`\`

Here are its current computed styles:
${Object.entries(data.computedStyle).map(([k, v]) => `${k}: ${v}`).join("\n")}

User's requested modification: ${data.prompt}

Return only the modified HTML element:`;

      // Load selected model from settings
      let aiModel = "gpt-4o";
      try {
        if (fs.existsSync(appSettingsPath)) {
          const settings = JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
          if (settings.aiModel) aiModel = settings.aiModel;
        }
      } catch { /* use default */ }

      // Models that require gh CLI token (need full Copilot Pro/Business subscription)
      const premiumModels = ["claude-sonnet-4.5", "claude-sonnet-4.6", "claude-opus-4.5", "claude-opus-4.6", "claude-opus-4.7", "claude-haiku-4.5", "gpt-4.1", "gpt-4.1-mini", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5-mini"];
      const isPremiumModel = premiumModels.includes(aiModel);

      // For premium models, we need the gh CLI token which has full Copilot access
      let apiToken = token;
      if (isPremiumModel) {
        const copilotToken = await getCopilotToken();
        if (!copilotToken) {
          return { success: false, error: `Model "${aiModel}" requires GitHub Copilot Pro/Business. Make sure your GitHub account has Copilot access, or select a Free model in Settings.` };
        }
        apiToken = copilotToken;
      }

      // All models use the Copilot API with copilot-4-cli integration
      const response = await fetch("https://api.githubcopilot.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Copilot-Integration-Id": "copilot-4-cli",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API error (${response.status}): ${errorText}` };
      }

      const result = await response.json();
      let modifiedHTML = result.choices?.[0]?.message?.content?.trim() || "";

      // Strip markdown code blocks if present
      modifiedHTML = modifiedHTML.replace(/^```(?:html)?\n?/i, "").replace(/\n?```$/i, "").trim();

      // Handle element removal
      if (modifiedHTML === "__REMOVE_ELEMENT__" || modifiedHTML === "") {
        return { success: true, html: "__REMOVE_ELEMENT__" };
      }

      return { success: true, html: modifiedHTML };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Auth handlers
  ipcMain.handle("auth-get-status", async () => {
    const auth = loadAuth();
    if (auth) {
      return { authenticated: true, login: auth.login, avatar_url: auth.avatar_url };
    }
    // Don't fall back to gh CLI if user explicitly logged out
    if (isExplicitlyLoggedOut()) {
      return { authenticated: false };
    }
    // Fallback: check gh CLI
    try {
      const { execSync } = require("child_process");
      const token = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
      if (token) {
        // Fetch user info with this token
        const res = await fetch("https://api.github.com/user", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          // Save it so we don't need to check CLI again
          const authData: AuthData = { token, login: user.login, avatar_url: user.avatar_url };
          saveAuth(authData);
          return { authenticated: true, login: user.login, avatar_url: user.avatar_url };
        }
      }
    } catch { /* gh not available */ }
    return { authenticated: false };
  });

  ipcMain.handle("auth-start-device-flow", async () => {
    try {
      const body = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        scope: "",
      });
      const res = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!res.ok) return { success: false, error: "Failed to start device flow" };
      const data = await res.json();
      // Open the verification URL in the user's browser
      shell.openExternal(data.verification_uri);
      return {
        success: true,
        user_code: data.user_code,
        device_code: data.device_code,
        interval: data.interval || 5,
        expires_in: data.expires_in,
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("auth-poll-device-flow", async (_event, deviceCode: string) => {
    try {
      const body = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const data = await res.json();
      console.log("Poll response:", JSON.stringify(data));

      if (data.error === "authorization_pending") {
        return { status: "pending" };
      } else if (data.error === "slow_down") {
        return { status: "slow_down" };
      } else if (data.error) {
        return { status: "error", error: data.error_description || data.error };
      } else if (data.access_token) {
        // Get user info
        const userRes = await fetch("https://api.github.com/user", {
          headers: { "Authorization": `Bearer ${data.access_token}` },
        });
        const user = await userRes.json();
        const authData: AuthData = {
          token: data.access_token,
          login: user.login || "User",
          avatar_url: user.avatar_url,
        };
        saveAuth(authData);
        return { status: "success", login: authData.login, avatar_url: authData.avatar_url };
      }
      return { status: "error", error: "Unexpected response" };
    } catch (error: unknown) {
      return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("auth-logout", () => {
    clearAuth();
    return { success: true };
  });

  ipcMain.handle("auth-check-gh-cli", async () => {
    const { execFile } = require("child_process");
    const { promisify } = require("util");
    const execFileAsync = promisify(execFile);
    try {
      const { stdout: token } = await execFileAsync("gh", ["auth", "token"], { encoding: "utf-8", env: shellEnv });
      if (token.trim()) {
        const { stdout: userJson } = await execFileAsync("gh", ["api", "user"], { encoding: "utf-8", env: shellEnv });
        const user = JSON.parse(userJson.trim());
        return { connected: true, login: user.login };
      }
    } catch { /* gh not available or not authenticated */ }
    return { connected: false };
  });

  // App settings handlers
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
    // Sum sizes of all files belonging to this project (html, png, history, snapshots)
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

  // Auto-update: check for newer release on GitHub
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
        // Find the right asset for this platform
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

  // Open a URL in the default browser
  ipcMain.handle("open-external", (_event, url: string) => {
    shell.openExternal(url);
  });

  // Open the project's latest HTML file in the default browser
  ipcMain.handle("open-project-in-browser", (_event, id: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false, error: "Project file not found" };
    shell.openPath(htmlPath);
    return { success: true };
  });

  // Get current app version
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  // --- Export handlers ---

  /**
   * Clean captured HTML for export:
   * - Strip <script> and <noscript> tags (external scripts won't work offline)
   * - Resolve relative URLs to absolute using the original page URL
   */
  function cleanHtmlForExport(html: string, baseUrl?: string): string {
    let cleaned = html;

    // Strip any <base> tags (injected for preview, not needed in export)
    cleaned = cleaned.replace(/<base\b[^>]*>/gi, "");

    // Strip all <script> tags — external scripts won't work offline
    cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    // Strip <noscript> wrappers
    cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

    // Resolve relative URLs to absolute using the original page URL
    if (baseUrl) {
      try {
        const base = new URL(baseUrl);
        const origin = base.origin;
        // Convert protocol-relative URLs (//example.com/...) to absolute
        cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/\//gi, `$1https://`);
        // Convert root-relative URLs (/path/...) to absolute
        cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/(?!\/)/gi, `$1${origin}/`);
        // Convert relative URLs in CSS url() references
        cleaned = cleaned.replace(/(url\(\s*['"]?)\/\//gi, `$1https://`);
        cleaned = cleaned.replace(/(url\(\s*['"]?)\/(?!\/)/gi, `$1${origin}/`);
      } catch {
        // If baseUrl is invalid, skip URL resolution
      }
    }

    return cleaned;
  }

  // Export as files: extract HTML + CSS to a user-chosen folder
  ipcMain.handle("export-save-files", async (_event, data: { projectId: string; html: string; baseUrl?: string }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { success: false, error: "No window available" };

      const result = await dialog.showOpenDialog(win, {
        title: "Choose export folder",
        buttonLabel: "Save",
        properties: ["openDirectory", "createDirectory"],
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, error: "cancelled" };
      }

      const destDir = result.filePaths[0];
      const fullHtml = cleanHtmlForExport(data.html, data.baseUrl);

      // Extract <style> blocks into a separate CSS file
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      let cssContent = "";
      let match: RegExpExecArray | null;
      const styleTags: string[] = [];

      while ((match = styleRegex.exec(fullHtml)) !== null) {
        cssContent += match[1].trim() + "\n\n";
        styleTags.push(match[0]);
      }

      let htmlForFile = fullHtml;
      if (cssContent.trim()) {
        // Remove all <style> blocks from HTML
        for (const tag of styleTags) {
          htmlForFile = htmlForFile.replace(tag, "");
        }
        // Add link to external stylesheet in <head>
        htmlForFile = htmlForFile.replace(
          /<\/head>/i,
          '  <link rel="stylesheet" href="styles.css">\n</head>'
        );
        // Write CSS file
        fs.writeFileSync(path.join(destDir, "styles.css"), cssContent.trim(), "utf-8");
      }

      // Write HTML file
      fs.writeFileSync(path.join(destDir, "index.html"), htmlForFile, "utf-8");

      // Copy project assets folder if it exists, and rewrite paths in exported HTML
      const assetsDir = path.join(projectsDir, `${data.projectId}.assets`);
      if (fs.existsSync(assetsDir)) {
        const destAssetsDir = path.join(destDir, "assets");
        if (!fs.existsSync(destAssetsDir)) {
          fs.mkdirSync(destAssetsDir, { recursive: true });
        }
        const files = fs.readdirSync(assetsDir);
        for (const file of files) {
          fs.copyFileSync(path.join(assetsDir, file), path.join(destAssetsDir, file));
        }
        // Rewrite asset paths from {id}.assets/ to assets/ in the exported HTML and CSS
        const idAssetsPrefix = `${data.projectId}.assets/`;
        htmlForFile = htmlForFile.split(idAssetsPrefix).join("assets/");
        if (cssContent) {
          cssContent = cssContent.split(idAssetsPrefix).join("assets/");
          fs.writeFileSync(path.join(destDir, "styles.css"), cssContent.trim(), "utf-8");
        }
        // Re-write the HTML file with updated asset paths
        fs.writeFileSync(path.join(destDir, "index.html"), htmlForFile, "utf-8");
      }

      return { success: true, path: destDir };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Export as image: use Puppeteer to render HTML at given dimensions and save as PNG
  ipcMain.handle("export-as-image", async (_event, data: { html: string; width: number; height: number; baseUrl?: string; projectId?: string }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { success: false, error: "No window available" };

      const result = await dialog.showSaveDialog(win, {
        title: "Save screenshot",
        defaultPath: "screenshot.png",
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: "cancelled" };
      }

      const cleanedHtml = cleanHtmlForExport(data.html, data.baseUrl);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        const page = await browser.newPage();
        await page.setViewport({ width: data.width, height: data.height });

        // If there's a project with assets, write a temp file in the projects dir so relative paths resolve
        if (data.projectId) {
          const tempHtmlPath = path.join(projectsDir, `${data.projectId}.export-temp.html`);
          fs.writeFileSync(tempHtmlPath, cleanedHtml, "utf-8");
          try {
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: "networkidle0", timeout: 30000 });
            await page.screenshot({ path: result.filePath, type: "png", fullPage: true });
          } finally {
            fs.unlinkSync(tempHtmlPath);
          }
        } else {
          await page.setContent(cleanedHtml, { waitUntil: "networkidle0", timeout: 30000 });
          await page.screenshot({ path: result.filePath, type: "png", fullPage: true });
        }

        return { success: true, path: result.filePath };
      } finally {
        await browser.close();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Deploy to CodeSandbox using a temp HTML form that auto-submits via POST.
  // This avoids both URL length limits (GET) and Cloudflare bot blocks (server-side fetch).
  ipcMain.handle("deploy-codesandbox", async (_event, data: { html: string; css?: string; baseUrl?: string }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LZString = require("lz-string");

      let htmlContent = cleanHtmlForExport(data.html, data.baseUrl);

      // Basic minification: collapse whitespace, remove HTML comments
      htmlContent = htmlContent
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/^\s+/gm, "");

      const files: Record<string, { content: string }> = {};

      if (data.css) {
        let css = data.css;
        // Basic CSS minification
        css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
        files["styles.css"] = { content: css };
        if (!htmlContent.includes('href="styles.css"')) {
          htmlContent = htmlContent.replace(
            /<\/head>/i,
            '  <link rel="stylesheet" href="styles.css">\n</head>'
          );
        }
      }

      files["index.html"] = { content: htmlContent };
      files["package.json"] = {
        content: JSON.stringify({
          name: "mockpilot-export",
          version: "1.0.0",
          description: "Exported from MockPilot",
          main: "index.html",
        }, null, 2),
      };

      // Check total size — CodeSandbox define API has ~5MB payload limit
      const totalSize = Object.values(files).reduce((sum, f) => sum + f.content.length, 0);
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      if (totalSize > 5 * 1024 * 1024) {
        return {
          success: false,
          error: `Project is too large for CodeSandbox (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`,
        };
      }

      const parameters = LZString.compressToBase64(JSON.stringify({ files }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Write a temp HTML file with a form that auto-submits to CodeSandbox
      const tmpDir = path.join(app.getPath("temp"), "mockpilot-deploy");
      fs.mkdirSync(tmpDir, { recursive: true });
      const tmpFile = path.join(tmpDir, "deploy.html");

      const formHtml = `<!DOCTYPE html>
<html>
<head><title>Deploying to CodeSandbox...</title></head>
<body style="background:#0b1326;color:#dae2fd;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Deploying to CodeSandbox…</p>
  <form id="f" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST">
    <input type="hidden" name="parameters" value="${parameters}">
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;

      fs.writeFileSync(tmpFile, formHtml, "utf-8");
      await shell.openExternal(`file://${tmpFile}`);

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Deploy to StackBlitz using their form POST API (no auth required)
  ipcMain.handle("deploy-stackblitz", async (_event, data: { html: string; css?: string; baseUrl?: string }) => {
    try {
      let htmlContent = cleanHtmlForExport(data.html, data.baseUrl);

      // Basic minification
      htmlContent = htmlContent
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/^\s+/gm, "");

      const files: Record<string, string> = {};

      if (data.css) {
        let css = data.css;
        css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").replace(/^\s+/gm, "");
        files["styles.css"] = css;
        if (!htmlContent.includes('href="styles.css"')) {
          htmlContent = htmlContent.replace(
            /<\/head>/i,
            '  <link rel="stylesheet" href="styles.css">\n</head>'
          );
        }
      }

      files["index.html"] = htmlContent;

      // Check total size — StackBlitz form POST has practical limits (~5MB)
      const totalSize = Object.values(files).reduce((sum, f) => sum + f.length, 0);
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      if (totalSize > 5 * 1024 * 1024) {
        return {
          success: false,
          error: `Project is too large for StackBlitz (${sizeMB} MB). Use "Download ZIP" and deploy manually instead.`,
        };
      }

      // Build form fields for StackBlitz
      const formFields = Object.entries(files)
        .map(([name, content]) => {
          const escaped = content.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          return `<input type="hidden" name="project[files][${name}]" value="${escaped}">`;
        })
        .join("\n    ");

      const tmpDir = path.join(app.getPath("temp"), "mockpilot-deploy");
      fs.mkdirSync(tmpDir, { recursive: true });
      const tmpFile = path.join(tmpDir, "stackblitz.html");

      const formHtml = `<!DOCTYPE html>
<html>
<head><title>Opening in StackBlitz...</title></head>
<body style="background:#0b1326;color:#dae2fd;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Opening in StackBlitz…</p>
  <form id="f" action="https://stackblitz.com/run" method="POST" target="_self">
    <input type="hidden" name="project[title]" value="MockPilot Export">
    <input type="hidden" name="project[description]" value="Exported from MockPilot">
    <input type="hidden" name="project[template]" value="html">
    ${formFields}
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;

      fs.writeFileSync(tmpFile, formHtml, "utf-8");
      await shell.openExternal(`file://${tmpFile}`);

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  createWindow();
});

// Compare semver strings: returns >0 if a > b, <0 if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
