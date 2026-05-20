import { BrowserWindow, dialog } from "electron";
import path from "path";
import fs from "fs";

import { cleanHtmlForExport } from "./index";
import { projectsDir } from "../projects";

type ExportAsImageData = {
  html: string;
  width: number;
  height: number;
  baseUrl?: string;
  projectId?: string;
};

type RenderHtmlToImageOptions = {
  html: string;
  width: number;
  height: number;
  filePath: string;
  projectId?: string;
};

type PuppeteerModule = {
  launch(options: { headless: boolean; args: string[] }): Promise<{
    newPage(): Promise<{
      setViewport(viewport: { width: number; height: number }): Promise<void>;
      setContent(html: string, options: { waitUntil: string; timeout: number }): Promise<void>;
      goto(url: string, options: { waitUntil: string; timeout: number }): Promise<void>;
      screenshot(options: { path: string; type: string; fullPage: boolean }): Promise<void>;
    }>;
    close(): Promise<void>;
  }>;
};

function loadPuppeteer(): PuppeteerModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("puppeteer") as PuppeteerModule;
}

async function withTempExportFile<T>(projectId: string, html: string, run: (url: string) => Promise<T>): Promise<T> {
  const tempHtmlPath = path.join(projectsDir, `${projectId}.export-temp.html`);
  fs.writeFileSync(tempHtmlPath, html, "utf-8");
  try {
    return await run(`file://${tempHtmlPath}`);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

async function loadHtmlIntoPage(
  page: Awaited<ReturnType<PuppeteerModule["launch"]>> extends { newPage(): Promise<infer P> } ? P : never,
  options: Pick<RenderHtmlToImageOptions, "html" | "projectId">
): Promise<void> {
  if (!options.projectId) {
    await page.setContent(options.html, { waitUntil: "networkidle0", timeout: 30000 });
    return;
  }

  await withTempExportFile(options.projectId, options.html, async (tempUrl) => {
    await page.goto(tempUrl, { waitUntil: "networkidle0", timeout: 30000 });
  });
}

async function renderHtmlToImage(options: RenderHtmlToImageOptions): Promise<void> {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: options.width, height: options.height });
    await loadHtmlIntoPage(page, options);
    await page.screenshot({ path: options.filePath, type: "png", fullPage: true });
  } finally {
    await browser.close();
  }
}

export async function handleExportAsImage(
  _event: Electron.IpcMainInvokeEvent,
  data: ExportAsImageData
) {
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

    await renderHtmlToImage({
      html: cleanHtmlForExport(data.html, data.baseUrl),
      width: data.width,
      height: data.height,
      filePath: result.filePath,
      projectId: data.projectId,
    });

    return { success: true, path: result.filePath };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
