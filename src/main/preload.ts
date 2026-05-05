import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  captureWebsite: (url: string) => ipcRenderer.invoke("capture-website", url),
  listProjects: () => ipcRenderer.invoke("list-projects"),
  saveProject: (data: { url: string; title: string; html: string; thumbnail?: string }) =>
    ipcRenderer.invoke("save-project", data),
  loadProject: (id: string) => ipcRenderer.invoke("load-project", id),
  renameProject: (id: string, newTitle: string) => ipcRenderer.invoke("rename-project", id, newTitle),
  deleteProject: (id: string) => ipcRenderer.invoke("delete-project", id),
  getProjectThumbnail: (id: string) => ipcRenderer.invoke("get-project-thumbnail", id),
  aiModifyElement: (data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) =>
    ipcRenderer.invoke("ai-modify-element", data),
});
