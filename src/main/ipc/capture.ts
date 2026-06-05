import { ipcMain } from "electron";
import path from "path";

import { handleCaptureIframes } from "../capture/iframes";
import { handleCaptureWebsite } from "../capture/website";
import { handleCaptureFullPage } from "../capture/full-page-screenshot";
import { handleFormatHtml } from "../capture/format-html";

export function registerCaptureHandlers() {
  ipcMain.handle("capture-website", handleCaptureWebsite);
  ipcMain.handle("get-webview-preload-path", () => path.join(__dirname, "webviewPreload.js"));
  ipcMain.handle("capture-log", (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log("[Capture]", ...args);
  });
  ipcMain.handle("capture-webview-iframes", handleCaptureIframes);
  ipcMain.handle("capture-webview-full-page", handleCaptureFullPage);
  ipcMain.handle("format-html", handleFormatHtml);
}
