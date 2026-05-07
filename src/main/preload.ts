import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  captureWebsite: (url: string) => ipcRenderer.invoke("capture-website", url),
  formatHtml: (rawHtml: string) => ipcRenderer.invoke("format-html", rawHtml),
  getWebviewPreloadPath: () => ipcRenderer.invoke("get-webview-preload-path") as Promise<string>,
  listProjects: () => ipcRenderer.invoke("list-projects"),
  saveProject: (data: { url: string; title: string; html: string; thumbnail?: string }) =>
    ipcRenderer.invoke("save-project", data),
  loadProject: (id: string) => ipcRenderer.invoke("load-project", id),
  updateProjectHtml: (id: string, html: string) => ipcRenderer.invoke("update-project-html", id, html),
  saveProjectHistory: (id: string, data: { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] }) =>
    ipcRenderer.invoke("save-project-history", id, data),
  loadProjectHistory: (id: string) => ipcRenderer.invoke("load-project-history", id),
  renameProject: (id: string, newTitle: string) => ipcRenderer.invoke("rename-project", id, newTitle),
  deleteProject: (id: string) => ipcRenderer.invoke("delete-project", id),
  getProjectThumbnail: (id: string) => ipcRenderer.invoke("get-project-thumbnail", id),
  aiModifyElement: (data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) =>
    ipcRenderer.invoke("ai-modify-element", data),
  // Auth
  authGetStatus: () => ipcRenderer.invoke("auth-get-status"),
  authStartDeviceFlow: () => ipcRenderer.invoke("auth-start-device-flow"),
  authPollDeviceFlow: (deviceCode: string) => ipcRenderer.invoke("auth-poll-device-flow", deviceCode),
  authLogout: () => ipcRenderer.invoke("auth-logout"),
  authCheckGhCli: () => ipcRenderer.invoke("auth-check-gh-cli"),
  // App settings
  getAppSettings: () => ipcRenderer.invoke("get-app-settings"),
  saveAppSettings: (settings: { aiModel: string }) => ipcRenderer.invoke("save-app-settings", settings),
  getStorageInfo: () => ipcRenderer.invoke("get-storage-info"),
  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});
