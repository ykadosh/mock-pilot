import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  captureWebsite: (url: string) => ipcRenderer.invoke("capture-website", url),
});
