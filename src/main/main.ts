import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";

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

app.on("ready", () => {
  ensureProjectsDir();

  // List all projects
  ipcMain.handle("list-projects", () => {
    return getProjectsIndex();
  });

  // Save a new project
  ipcMain.handle("save-project", (_event, data: { url: string; title: string; html: string; thumbnail?: string }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };

    // Save HTML file
    fs.writeFileSync(path.join(projectsDir, `${id}.html`), data.html, "utf-8");

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
    return { success: true, html };
  });

  // Update a project's HTML (persist modifications)
  ipcMain.handle("update-project-html", (_event, id: string, html: string) => {
    const htmlPath = path.join(projectsDir, `${id}.html`);
    if (!fs.existsSync(htmlPath)) return { success: false };
    fs.writeFileSync(htmlPath, html, "utf-8");
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
      // Save each HTML snapshot
      for (let i = 0; i < data.htmlSnapshots.length; i++) {
        fs.writeFileSync(path.join(projectsDir, `${id}.snap.${i}.html`), data.htmlSnapshots[i], "utf-8");
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
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);

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

      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Increase timeout for evaluate since font inlining can take time
        page.setDefaultTimeout(60000);

        const html = await page.evaluate(async () => {
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
              // Resolve @font-face URLs relative to the stylesheet's URL
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

          // Convert images to data URIs
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
              // CORS images can't be converted
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

          // Collapse whitespace-only text nodes
          const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
          const textNodes: Text[] = [];
          while (textWalker.nextNode()) textNodes.push(textWalker.currentNode as Text);
          textNodes.forEach((t) => {
            if (t.textContent && /^\s+$/.test(t.textContent)) {
              t.textContent = "\n";
            }
          });

          return document.documentElement.outerHTML;
        });

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
        });

        return { success: true, html: `<!DOCTYPE html>\n${formattedHtml}`, thumbnail: `data:image/png;base64,${screenshot}` };
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

      return { success: true, path: destDir };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // Export as image: use Puppeteer to render HTML at given dimensions and save as PNG
  ipcMain.handle("export-as-image", async (_event, data: { html: string; width: number; height: number; baseUrl?: string }) => {
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
        await page.setContent(cleanedHtml, { waitUntil: "networkidle0", timeout: 30000 });
        await page.screenshot({ path: result.filePath, type: "png", fullPage: true });
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
