import { app, BrowserWindow, net, protocol } from "electron";
import path from "path";
import { pathToFileURL } from "url";

import { registerAiHandlers } from "./ipc/ai";
import { registerAgentHandlers } from "./ipc/ai-agent";
import { registerAuthHandlers } from "./ipc/auth";
import { registerCaptureHandlers } from "./ipc/capture";
import { registerExportHandlers } from "./ipc/export";
import { registerConversationHandlers } from "./ipc/conversation";
import { registerGraphicsHandlers } from "./ipc/graphics";
import { registerProjectHandlers } from "./ipc/projects";
import { registerSettingsHandlers } from "./ipc/settings";
import { ensureProjectsDir, migrateProjectsToFolders, projectsDir } from "./projects";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
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

protocol.registerSchemesAsPrivileged([
  { scheme: "mp-asset", privileges: { bypassCSP: true, supportFetchAPI: true, stream: true, corsEnabled: true, standard: true } },
]);

app.on("ready", () => {
  ensureProjectsDir();
  migrateProjectsToFolders();

  protocol.handle("mp-asset", (request) => {
    const url = new URL(request.url);
    const filePath = path.join(projectsDir, decodeURIComponent(url.pathname.replace(/^\//, "")));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  registerProjectHandlers();
  registerConversationHandlers();
  registerCaptureHandlers();
  registerAuthHandlers();
  registerAiHandlers();
  registerAgentHandlers(() => mainWindow);
  registerSettingsHandlers();
  registerExportHandlers();
  registerGraphicsHandlers();

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
