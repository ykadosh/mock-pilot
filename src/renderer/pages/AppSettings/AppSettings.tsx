import { TopNav } from "../../components/layout/TopNav";
import { useAppSettingsState } from "./AppSettings.hooks";
import { AgentIterationsSection } from "./AppSettingsIterationsSection";
import { ModelConfigurationSection } from "./AppSettingsModelSection";
import { ConnectivitySection, StorageSection, UpdatesSection } from "./AppSettingsStatusSections";

export function AppSettings() {
  const { appVersion, auth, ghCliStatus, handleCheckForUpdates, handleDownloadUpdate, handleMaxIterationsChange, handleModelChange, saved, settings, storage, updateStatus } = useAppSettingsState();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="bg-surface-container-lowest p-lg flex-1 overflow-y-auto">
        <div className="space-y-lg mx-auto max-w-4xl">
          <ConnectivitySection authenticated={auth.authenticated} ghCliStatus={ghCliStatus} login={auth.login} />
          <ModelConfigurationSection onModelChange={handleModelChange} saved={saved} selectedModel={settings.aiModel} />
          <AgentIterationsSection maxIterations={settings.maxIterations ?? 20} onMaxIterationsChange={handleMaxIterationsChange} saved={saved} />
          <StorageSection storage={storage} />
          <UpdatesSection appVersion={appVersion} handleCheckForUpdates={handleCheckForUpdates} handleDownloadUpdate={handleDownloadUpdate} updateStatus={updateStatus} />
        </div>
      </main>
    </div>
  );
}
