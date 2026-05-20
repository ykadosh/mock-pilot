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
  handleModelChange: (modelId: string) => Promise<void>;
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
  ]);
}

function flashSavedState(setSaved: Dispatch<SetStateAction<boolean>>) {
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}

export function useAppSettingsState(): AppSettingsController {
  const [settings, setSettings] = useState<AppSettingsData>({ aiModel: "gpt-4o" });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [ghCliStatus, setGhCliStatus] = useState<GhCliStatus | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ checking: false });
  const [appVersion, setAppVersion] = useState("");
  const auth = useAuth();

  useEffect(() => {
    void loadInitialAppSettingsData().then(([nextSettings, nextStorage, nextGhCliStatus, version]) => {
      if (nextSettings) setSettings(nextSettings);
      setStorage(nextStorage);
      setGhCliStatus(nextGhCliStatus);
      setAppVersion(version);
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateStatus({ checking: true });
    setUpdateStatus({ checking: false, ...(await window.api.checkForUpdates()) });
  };
  const handleDownloadUpdate = () => { if (updateStatus.downloadUrl) window.api.openExternal(updateStatus.downloadUrl); };
  const handleModelChange = async (modelId: string) => {
    const nextSettings = { ...settings, aiModel: modelId };
    setSettings(nextSettings);
    await window.api.saveAppSettings(nextSettings);
    flashSavedState(setSaved);
  };

  return { appVersion, auth, ghCliStatus, handleCheckForUpdates, handleDownloadUpdate, handleModelChange, saved, settings, storage, updateStatus };
}
