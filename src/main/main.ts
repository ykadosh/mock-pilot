import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";

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
  ipcMain.handle("save-project", (_event, data: { url: string; title: string; html: string }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    const meta: ProjectMeta = { id, title: data.title, url: data.url, createdAt: now, updatedAt: now };

    // Save HTML file
    fs.writeFileSync(path.join(projectsDir, `${id}.html`), data.html, "utf-8");

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

        return { success: true, html: `<!DOCTYPE html>\n${html}` };
      } finally {
        await browser.close();
      }
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
