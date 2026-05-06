import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Projects storage
const projectsDir = path.join(app.getPath("userData"), "projects");

function ensureProjectsDir() {
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
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

        const html = await page.evaluate(async () => {
          // Inline external stylesheets
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          for (const link of stylesheets) {
            try {
              const href = (link as HTMLLinkElement).href;
              const res = await fetch(href);
              const css = await res.text();
              const style = document.createElement("style");
              style.textContent = css;
              link.replaceWith(style);
            } catch {
              // Skip failed stylesheets
            }
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

          return document.documentElement.outerHTML;
        });

        // Take screenshot for thumbnail
        const screenshot = await page.screenshot({ type: "png", encoding: "base64" });

        return { success: true, html: `<!DOCTYPE html>\n${html}`, thumbnail: `data:image/png;base64,${screenshot}` };
      } finally {
        await browser.close();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  // AI element modification
  ipcMain.handle("ai-modify-element", async (_event, data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) => {
    try {
      // Get GitHub token from gh CLI
      let token: string;
      try {
        token = execSync("gh auth token", { encoding: "utf-8" }).trim();
      } catch {
        return { success: false, error: "Not authenticated with GitHub. Run `gh auth login` first." };
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
- IMPORTANT: Preserve any data-mp-id attribute exactly as-is. Do not remove or modify it.`;

      const userMessage = `Here is the selected element's HTML:
\`\`\`html
${data.outerHTML}
\`\`\`

Here are its current computed styles:
${Object.entries(data.computedStyle).map(([k, v]) => `${k}: ${v}`).join("\n")}

User's requested modification: ${data.prompt}

Return only the modified HTML element:`;

      const response = await fetch("https://models.github.ai/inference/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
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

      return { success: true, html: modifiedHTML };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

  createWindow();
});

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
