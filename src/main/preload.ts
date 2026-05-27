import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  captureLog: (...args: unknown[]) => ipcRenderer.invoke("capture-log", ...args),
  captureWebviewIframes: (webContentsId: number) => ipcRenderer.invoke("capture-webview-iframes", webContentsId) as Promise<{ success: boolean; iframes?: { url: string; html: string; childIframeSrcs: string[] }[]; error?: string }>,
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
  saveProjectConversation: (id: string, sessionId: string, payload: { displayMessages?: { role: string; content: string; timestamp: number; type?: string }[]; agentMessages?: unknown[]; title?: string }) =>
    ipcRenderer.invoke("save-project-conversation", { projectId: id, sessionId, ...payload }),
  loadProjectConversation: (id: string, sessionId: string) =>
    ipcRenderer.invoke("load-project-conversation", id, sessionId),
  listProjectConversations: (id: string) => ipcRenderer.invoke("list-project-conversations", id),
  createProjectConversation: (id: string, title?: string) => ipcRenderer.invoke("create-project-conversation", id, title),
  deleteProjectConversation: (id: string, sessionId: string) => ipcRenderer.invoke("delete-project-conversation", id, sessionId),
  renameProject: (id: string, newTitle: string) => ipcRenderer.invoke("rename-project", id, newTitle),
  deleteProject: (id: string) => ipcRenderer.invoke("delete-project", id),
  duplicateProject: (id: string) => ipcRenderer.invoke("duplicate-project", id),
  getProjectThumbnail: (id: string) => ipcRenderer.invoke("get-project-thumbnail", id),
  regenerateProjectThumbnail: (id: string) => ipcRenderer.invoke("regenerate-project-thumbnail", id),
  aiModifyElement: (data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) =>
    ipcRenderer.invoke("ai-modify-element", data),
  aiModifyPage: (data: { prompt: string; fullHTML: string; images?: { name: string; dataUrl: string }[] }) =>
    ipcRenderer.invoke("ai-modify-page", data),
  aiExtractComponents: (data: { simplifiedHtml: string; screenshot?: string }) =>
    ipcRenderer.invoke("ai-extract-components", data),
  aiCancelRequest: () => ipcRenderer.invoke("ai-cancel-request"),
  // AI Agent
  aiAgentModify: (data: { prompt: string; fullHTML: string; projectId?: string; attachedElements?: { mpId: string; selector: string; outerHTML: string }[]; images?: { name: string; dataUrl: string }[]; projectAssets?: object; previousAgentMessages?: unknown[]; continueFromMaxIterations?: boolean }) =>
    ipcRenderer.invoke("ai-agent-modify", data),
  aiAgentCancel: () => ipcRenderer.invoke("ai-agent-cancel"),
  onAiAgentProgress: (callback: (progress: { type: string; toolName?: string; iteration?: number; maxIterations?: number; result?: string; error?: string; html?: string }) => void) => {
    const handler = (_event: unknown, progress: Parameters<typeof callback>[0]) => callback(progress);
    ipcRenderer.on("ai-agent-progress", handler);
    return () => { ipcRenderer.removeListener("ai-agent-progress", handler); };
  },
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
  getProjectSize: (id: string) => ipcRenderer.invoke("get-project-size", id),
  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  openProjectInBrowser: (id: string) => ipcRenderer.invoke("open-project-in-browser", id),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  // Export
  exportSaveFiles: (data: { projectId: string; html: string; baseUrl?: string }) =>
    ipcRenderer.invoke("export-save-files", data),
  exportAsImage: (data: { html: string; width: number; height: number; baseUrl?: string }) =>
    ipcRenderer.invoke("export-as-image", data),
  deployToCodesandbox: (data: { html: string; css?: string; baseUrl?: string }) =>
    ipcRenderer.invoke("deploy-codesandbox", data),
  deployToStackblitz: (data: { html: string; css?: string; baseUrl?: string }) =>
    ipcRenderer.invoke("deploy-stackblitz", data),
  // Project assets
  saveProjectAssets: (id: string, assets: { typography: unknown[]; colors: unknown[]; fontFaceCss?: string; icons?: { libraries: string[] }; components?: unknown[]; componentsCss?: string }) =>
    ipcRenderer.invoke("save-project-assets", id, assets),
  loadProjectAssets: (id: string) => ipcRenderer.invoke("load-project-assets", id),
  extractIconFontGlyphs: (id: string) => ipcRenderer.invoke("extract-icon-font-glyphs", id),
  listProjectGraphics: (id: string) => ipcRenderer.invoke("list-project-graphics", id),
});
