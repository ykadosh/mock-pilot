import { useEffect, useState } from "react";
import { TopNav } from "../components/layout/TopNav";
import { useAuth } from "../hooks/useAuth";

interface StorageInfo {
  totalBytes: number;
  projectCount: number;
}

interface AppSettingsData {
  aiModel: string;
}

const AI_MODELS = [
  // Works with any GitHub account (Copilot Free tier via device flow)
  { id: "gpt-4o", name: "GPT-4o", publisher: "OpenAI", context: "128K", tier: "Free", description: "Advanced multimodal model for text and image tasks." },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", publisher: "OpenAI", context: "128K", tier: "Free", description: "Fast and affordable multimodal for diverse tasks." },
  // Requires Copilot Pro/Business subscription
  { id: "gpt-4.1", name: "GPT-4.1", publisher: "OpenAI", context: "1M", tier: "Pro", description: "Top coding, instruction following, and long-context understanding." },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", publisher: "OpenAI", context: "1M", tier: "Pro", description: "Fast and efficient for everyday tasks." },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Fast and capable. Great for everyday coding and creative tasks." },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Balanced performance with exceptional coding and nuance." },
  { id: "claude-opus-4.6", name: "Claude Opus 4.6", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Most capable Claude. Deep reasoning and complex tasks." },
  { id: "claude-opus-4.7", name: "Claude Opus 4.7", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Latest Opus with improved reasoning capabilities." },
  { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Fastest Claude model. Low latency responses." },
  { id: "gpt-5.4", name: "GPT-5.4", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Latest GPT model with advanced reasoning." },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Efficient next-gen model for most tasks." },
  { id: "gpt-5.2", name: "GPT-5.2", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Strong general-purpose model with reasoning." },
  { id: "gpt-5-mini", name: "GPT-5 Mini", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Lightweight reasoning model." },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function AppSettings() {
  const [settings, setSettings] = useState<AppSettingsData>({ aiModel: "gpt-4o" });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [ghCliStatus, setGhCliStatus] = useState<{ connected: boolean; login?: string } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    checking: boolean;
    updateAvailable?: boolean;
    currentVersion?: string;
    latestVersion?: string;
    downloadUrl?: string;
    error?: string;
  }>({ checking: false });
  const [appVersion, setAppVersion] = useState<string>("");
  const auth = useAuth();

  useEffect(() => {
    window.api.getAppSettings().then((s) => {
      if (s) setSettings(s);
    });
    window.api.getStorageInfo().then(setStorage);
    window.api.authCheckGhCli().then(setGhCliStatus);
    window.api.getAppVersion().then(setAppVersion);
  }, []);

  const handleModelChange = async (modelId: string) => {
    const updated = { ...settings, aiModel: modelId };
    setSettings(updated);
    await window.api.saveAppSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheckForUpdates = async () => {
    setUpdateStatus({ checking: true });
    const result = await window.api.checkForUpdates();
    setUpdateStatus({ checking: false, ...result });
  };

  const handleDownloadUpdate = () => {
    if (updateStatus.downloadUrl) {
      window.api.openExternal(updateStatus.downloadUrl);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <TopNav />
      <main className="bg-surface-container-lowest p-lg absolute top-12 right-0 bottom-0 left-0 overflow-y-auto">
        <div className="space-y-lg mx-auto max-w-4xl">
            {/* Connectivity Status */}
            <section className="space-y-md">
              <div className="border-outline-variant pb-xs border-b">
                <h2 className="font-headline-md text-headline-md text-on-surface">Connectivity</h2>
              </div>
              <div className="border-outline-variant bg-surface-container divide-outline-variant/50 divide-y rounded border">
                {/* GitHub OAuth status */}
                <div className="gap-md px-md py-sm flex items-center">
                  <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${auth.authenticated ? "bg-green-400" : "bg-slate-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="gap-sm flex items-center">
                      <span className="text-body-main text-on-surface font-medium">GitHub Account</span>
                      <span className={`rounded bg-green-400/10 px-1.5 py-0.5 font-mono text-[10px] text-green-400`}>Free models</span>
                      <div className="group relative">
                        <span className="material-symbols-outlined text-on-surface-variant cursor-help text-sm">help</span>
                        <div className="bg-surface-container-highest text-on-surface pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded px-3 py-2 text-xs whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Sign in via the user icon in the top bar. Gives access to Free tier models (GPT-4o).
                        </div>
                      </div>
                    </div>
                    <div className="text-ui-small text-on-surface-variant">
                      {auth.authenticated ? `Connected as ${auth.login}` : "Not connected"}
                    </div>
                  </div>
                </div>
                {/* gh CLI status */}
                <div className="gap-md px-md py-sm flex items-center">
                  <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${ghCliStatus?.connected ? "bg-green-400" : "bg-slate-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="gap-sm flex items-center">
                      <span className="text-body-main text-on-surface font-medium">GitHub Copilot (gh CLI)</span>
                      <span className={`rounded bg-violet-400/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-400`}>Pro models</span>
                      <div className="group relative">
                        <span className="material-symbols-outlined text-on-surface-variant cursor-help text-sm">help</span>
                        <div className="bg-surface-container-highest text-on-surface pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {ghCliStatus?.connected
                            ? "Connected via gh CLI. You have access to Pro models (Claude, GPT-4.1, GPT-5)."
                            : "Install the GitHub CLI (gh) and run \"gh auth login\" in your terminal to unlock Pro models like Claude and GPT-5."
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-ui-small text-on-surface-variant">
                      {ghCliStatus === null ? "Checking..." : ghCliStatus.connected ? `Connected as ${ghCliStatus.login}` : "Not connected"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Model Selection */}
            <section className="space-y-md">
              <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
                <h2 className="font-headline-md text-headline-md text-on-surface">AI Model Configuration</h2>
                {saved && (
                  <span className="text-ui-small rounded bg-green-400/10 px-2 py-0.5 font-mono text-green-400">
                    Saved ✓
                  </span>
                )}
              </div>
              <p className="text-ui-small text-on-surface-variant">
                <span className="text-green-400">Free</span> models work with any GitHub account. <span className="text-violet-400">Pro</span> models require a GitHub Copilot Pro/Business subscription.
              </p>
              <div className="space-y-md">
                {Object.entries(
                  AI_MODELS.reduce((groups, model) => {
                    (groups[model.publisher] ||= []).push(model);
                    return groups;
                  }, {} as Record<string, typeof AI_MODELS>)
                ).map(([publisher, models]) => (
                  <div key={publisher}>
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">{publisher}</h3>
                    <div className="border-outline-variant bg-surface-container divide-outline-variant/50 divide-y rounded border">
                      {models.map((model) => (
                        <label
                          key={model.id}
                          className={`gap-md px-md py-sm hover:bg-surface-container-high flex cursor-pointer items-center transition-colors ${
                            settings.aiModel === model.id ? "bg-surface-container-high" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="llm_model"
                            checked={settings.aiModel === model.id}
                            onChange={() => handleModelChange(model.id)}
                            className="sr-only"
                          />
                          <div className={`h-3 w-3 flex-shrink-0 rounded-full border-2 ${
                            settings.aiModel === model.id
                              ? "border-primary bg-primary"
                              : "border-outline"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="gap-sm flex items-center">
                              <span className="text-body-main text-on-surface font-medium">{model.name}</span>
                              <span className="text-on-surface-variant bg-surface-container-highest rounded px-1.5 py-0.5 font-mono text-[10px]">{model.context}</span>
                              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                                model.tier === "Free" ? "bg-green-400/10 text-green-400" :
                                "bg-violet-400/10 text-violet-400"
                              }`}>{model.tier}</span>
                            </div>
                            <div className="text-ui-small text-on-surface-variant truncate">{model.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-md">
              <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
                <h2 className="font-headline-md text-headline-md text-on-surface">Storage</h2>
              </div>
              <div className="border-outline-variant bg-surface-container p-md border">
                <div className="mb-md flex items-center justify-between">
                  <div className="gap-sm flex items-center">
                    <span className="material-symbols-outlined text-on-surface-variant">cloud_queue</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">Storage Utilization</span>
                  </div>
                  {storage && (
                    <span className="text-ui-small text-on-surface font-mono">{formatBytes(storage.totalBytes)}</span>
                  )}
                </div>
                {storage && (
                  <>
                    <div className="bg-surface-container-highest mb-sm h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(210,187,255,0.4)]"
                        style={{ width: `${Math.min(100, (storage.totalBytes / (1024 * 1024 * 1024)) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-ui-small text-on-surface-variant">
                      {storage.projectCount} project{storage.projectCount !== 1 ? "s" : ""} using {formatBytes(storage.totalBytes)} of local storage.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Updates */}
            <section className="space-y-md">
              <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
                <h2 className="font-headline-md text-headline-md text-on-surface">Updates</h2>
                {appVersion && (
                  <span className="text-ui-small text-on-surface-variant font-mono">v{appVersion}</span>
                )}
              </div>
              <div className="border-outline-variant bg-surface-container p-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-main text-on-surface">
                      {updateStatus.checking
                        ? "Checking for updates..."
                        : updateStatus.updateAvailable
                          ? `A new version (v${updateStatus.latestVersion}) is available!`
                          : updateStatus.latestVersion
                            ? "You're on the latest version."
                            : "Check if a newer version is available."}
                    </p>
                    {updateStatus.error && (
                      <p className="text-ui-small text-error mt-xs">{updateStatus.error}</p>
                    )}
                  </div>
                  <div className="gap-sm flex">
                    {updateStatus.updateAvailable && (
                      <button
                        onClick={handleDownloadUpdate}
                        className="bg-primary text-on-primary text-ui-small px-md py-sm rounded font-semibold transition-all hover:brightness-110"
                      >
                        Download Update
                      </button>
                    )}
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={updateStatus.checking}
                      className="border-outline text-on-surface text-ui-small px-md py-sm hover:bg-surface-container-high rounded border font-semibold transition-colors disabled:opacity-50"
                    >
                      {updateStatus.checking ? "Checking..." : "Check for Updates"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
  );
}
