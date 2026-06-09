import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { AppSettingsData, GhCliStatus, StorageInfo, UpdateStatus } from "./AppSettings.utils";

interface AppSettingsController {
  appVersion: string;
  auth: ReturnType<typeof useAuth>;
  ghCliStatus: GhCliStatus | null;
  handleCheckForUpdates: () => Promise<void>;
  handleDownloadUpdate: () => void;
  handleMaxIterationsChange: (value: number) => Promise<void>;
  handleModelChange: (modelId: string) => Promise<void>;
  handleAuditModeChange: (value: boolean) => Promise<void>;
  isDevMode: boolean;
  saved: boolean;
  settings: AppSettingsData;
  storage: StorageInfo | null;
  updateStatus: UpdateStatus;
}

async function loadInitialAppSettingsData() {
  return Promise.all([
    window.api.getAppSettings(),
    window.api.getStorageInfo(),
    window.api.authCheckGhCli(),
    window.api.getAppVersion(),
    window.api.isDevMode(),
  ]);
}

function flashSavedState(setSaved: Dispatch<SetStateAction<boolean>>) {
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}

function useSettingMutators(settings: AppSettingsData, setSettings: Dispatch<SetStateAction<AppSettingsData>>, setSaved: Dispatch<SetStateAction<boolean>>) {
  const update = async <K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await window.api.saveAppSettings(next);
    flashSavedState(setSaved);
  };
  return {
    handleModelChange: (modelId: string) => update("aiModel", modelId),
    handleMaxIterationsChange: (value: number) => update("maxIterations", value),
    handleAuditModeChange: (value: boolean) => update("auditMode", value),
  };
}

export function useAppSettingsState(): AppSettingsController {
  const [settings, setSettings] = useState<AppSettingsData>({ aiModel: "gpt-4o" });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [ghCliStatus, setGhCliStatus] = useState<GhCliStatus | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ checking: false });
  const [appVersion, setAppVersion] = useState("");
  const [isDevMode, setIsDevMode] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    void loadInitialAppSettingsData().then(([nextSettings, nextStorage, nextGhCliStatus, version, devMode]) => {
      if (nextSettings) setSettings(nextSettings);
      setStorage(nextStorage);
      setGhCliStatus(nextGhCliStatus);
      setAppVersion(version);
      setIsDevMode(devMode);
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateStatus({ checking: true });
    setUpdateStatus({ checking: false, ...(await window.api.checkForUpdates()) });
  };
  const handleDownloadUpdate = () => { if (updateStatus.downloadUrl) window.api.openExternal(updateStatus.downloadUrl); };
  const { handleModelChange, handleMaxIterationsChange, handleAuditModeChange } = useSettingMutators(settings, setSettings, setSaved);

  return { appVersion, auth, ghCliStatus, handleCheckForUpdates, handleDownloadUpdate, handleMaxIterationsChange, handleModelChange, handleAuditModeChange, isDevMode, saved, settings, storage, updateStatus };
}
