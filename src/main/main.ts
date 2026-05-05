import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { captureWebsite } from "./capture";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

// IPC handler for capturing websites
ipcMain.handle("capture-website", async (_event, url: string) => {
  try {
    const html = await captureWebsite(url);
    return { success: true, html };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
});

app.on("ready", createWindow);

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
