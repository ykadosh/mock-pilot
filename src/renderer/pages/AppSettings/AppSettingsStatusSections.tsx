import type { GhCliStatus, StorageInfo, UpdateStatus } from "./AppSettings.utils";
import { formatBytes, getGhCliStatusText, getGhCliTooltipText, getUpdateMessage } from "./AppSettings.utils";

interface ConnectivitySectionProps {
  authenticated: boolean;
  ghCliStatus: GhCliStatus | null;
  login?: string;
}

interface ConnectivityRowProps {
  badgeClassName: string;
  badgeText: string;
  connected: boolean;
  statusText: string;
  title: string;
  tooltipText: string;
}

export function ConnectivitySection({ authenticated, ghCliStatus, login }: ConnectivitySectionProps) {
  const accountStatus = authenticated ? `Connected as ${login}` : "Not connected";
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs border-b"><h2 className="font-headline-md text-headline-md text-on-surface">Connectivity</h2></div>
      <div className="border-outline-variant bg-surface-container divide-outline-variant/50 divide-y rounded border">
        <ConnectivityRow badgeClassName="bg-green-400/10 text-green-400" badgeText="Free models" connected={authenticated} statusText={accountStatus} title="GitHub Account" tooltipText="Sign in via the user icon in the top bar. Gives access to Free tier models (GPT-4o)." />
        <ConnectivityRow badgeClassName="bg-violet-400/10 text-violet-400" badgeText="Pro models" connected={Boolean(ghCliStatus?.connected)} statusText={getGhCliStatusText(ghCliStatus)} title="GitHub Copilot (gh CLI)" tooltipText={getGhCliTooltipText(ghCliStatus)} />
      </div>
    </section>
  );
}

function ConnectivityRow({ badgeClassName, badgeText, connected, statusText, title, tooltipText }: ConnectivityRowProps) {
  const dotClassName = connected ? "bg-green-400" : "bg-slate-500";
  return (
    <div className="gap-md px-md py-sm flex items-center">
      <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClassName}`} />
      <div className="min-w-0 flex-1">
        <div className="gap-sm flex items-center">
          <span className="text-body-main text-on-surface font-medium">{title}</span>
          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${badgeClassName}`}>{badgeText}</span>
          <div className="group relative">
            <span className="material-symbols-outlined text-on-surface-variant cursor-help text-sm">help</span>
            <div className="bg-surface-container-highest text-on-surface pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">{tooltipText}</div>
          </div>
        </div>
        <div className="text-ui-small text-on-surface-variant">{statusText}</div>
      </div>
    </div>
  );
}

export function StorageSection({ storage }: { storage: StorageInfo | null }) {
  const storageWidth = storage ? Math.min(100, (storage.totalBytes / (1024 * 1024 * 1024)) * 100) : 0;
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs flex items-center justify-between border-b"><h2 className="font-headline-md text-headline-md text-on-surface">Storage</h2></div>
      <div className="border-outline-variant bg-surface-container p-md border">
        <div className="mb-md flex items-center justify-between">
          <div className="gap-sm flex items-center"><span className="material-symbols-outlined text-on-surface-variant">cloud_queue</span><span className="font-label-caps text-label-caps text-on-surface-variant">Storage Utilization</span></div>
          {storage && <span className="text-ui-small text-on-surface font-mono">{formatBytes(storage.totalBytes)}</span>}
        </div>
        {storage && <><div className="bg-surface-container-highest mb-sm h-2 w-full overflow-hidden rounded-full"><div className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(210,187,255,0.4)]" style={{ width: `${storageWidth}%` }} /></div><p className="text-ui-small text-on-surface-variant">{storage.projectCount} project{storage.projectCount !== 1 ? "s" : ""} using {formatBytes(storage.totalBytes)} of local storage.</p></>}
      </div>
    </section>
  );
}

interface UpdatesSectionProps {
  appVersion: string;
  handleCheckForUpdates: () => Promise<void>;
  handleDownloadUpdate: () => void;
  updateStatus: UpdateStatus;
}

export function UpdatesSection({ appVersion, handleCheckForUpdates, handleDownloadUpdate, updateStatus }: UpdatesSectionProps) {
  const checkButtonLabel = updateStatus.checking ? "Checking..." : "Check for Updates";
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs flex items-center justify-between border-b"><h2 className="font-headline-md text-headline-md text-on-surface">Updates</h2>{appVersion && <span className="text-ui-small text-on-surface-variant font-mono">v{appVersion}</span>}</div>
      <div className="border-outline-variant bg-surface-container p-md border">
        <div className="flex items-center justify-between">
          <div><p className="text-body-main text-on-surface">{getUpdateMessage(updateStatus)}</p>{updateStatus.error && <p className="text-ui-small text-error mt-xs">{updateStatus.error}</p>}</div>
          <div className="gap-sm flex">{updateStatus.updateAvailable && <button onClick={handleDownloadUpdate} className="bg-primary text-on-primary text-ui-small px-md py-sm rounded font-semibold transition-all hover:brightness-110">Download Update</button>}<button onClick={handleCheckForUpdates} disabled={updateStatus.checking} className="border-outline text-on-surface text-ui-small px-md py-sm hover:bg-surface-container-high rounded border font-semibold transition-colors disabled:opacity-50">{checkButtonLabel}</button></div>
        </div>
      </div>
    </section>
  );
}
