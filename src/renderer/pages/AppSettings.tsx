import { TopNav } from "../components/layout/TopNav";
import { useAppSettingsState } from "./AppSettings.hooks";
import { ModelConfigurationSection } from "./AppSettingsModelSection";
import { ConnectivitySection, StorageSection, UpdatesSection } from "./AppSettingsStatusSections";

export function AppSettings() {
  const { appVersion, auth, ghCliStatus, handleCheckForUpdates, handleDownloadUpdate, handleModelChange, saved, settings, storage, updateStatus } = useAppSettingsState();

  return (
    <div className="h-full overflow-hidden">
      <TopNav />
      <main className="bg-surface-container-lowest p-lg absolute top-12 right-0 bottom-0 left-0 overflow-y-auto">
        <div className="space-y-lg mx-auto max-w-4xl">
          <ConnectivitySection authenticated={auth.authenticated} ghCliStatus={ghCliStatus} login={auth.login} />
          <ModelConfigurationSection onModelChange={handleModelChange} saved={saved} selectedModel={settings.aiModel} />
          <StorageSection storage={storage} />
          <UpdatesSection appVersion={appVersion} handleCheckForUpdates={handleCheckForUpdates} handleDownloadUpdate={handleDownloadUpdate} updateStatus={updateStatus} />
        </div>
      </main>
    </div>
  );
}
