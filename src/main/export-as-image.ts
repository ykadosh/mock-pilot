import { BrowserWindow, dialog } from "electron";
import path from "path";
import fs from "fs";

import { projectsDir } from "./projects";
import { cleanHtmlForExport } from "./export";

export async function handleExportAsImage(
  _event: Electron.IpcMainInvokeEvent,
  data: { html: string; width: number; height: number; baseUrl?: string; projectId?: string }
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
}
