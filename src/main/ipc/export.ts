import { ipcMain } from "electron";

import { handleExportSaveFiles } from "../export/save-files";
import { handleExportAsImage } from "../export/as-image";
import { handleDeployCodesandbox } from "../export/deploy-codesandbox";
import { handleDeployStackblitz } from "../export/deploy-stackblitz";

export function registerExportHandlers() {
  ipcMain.handle("export-save-files", handleExportSaveFiles);
  ipcMain.handle("export-as-image", handleExportAsImage);
  ipcMain.handle("deploy-codesandbox", handleDeployCodesandbox);
  ipcMain.handle("deploy-stackblitz", handleDeployStackblitz);
}
