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
  const auth = useAuth();

  useEffect(() => {
    window.api.getAppSettings().then((s) => {
      if (s) setSettings(s);
    });
    window.api.getStorageInfo().then(setStorage);
    window.api.authCheckGhCli().then(setGhCliStatus);
  }, []);

  const handleModelChange = async (modelId: string) => {
    const updated = { ...settings, aiModel: modelId };
    setSettings(updated);
    await window.api.saveAppSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-screen overflow-hidden">
      <TopNav />
      <main className="h-[calc(100vh-48px)] mt-12 bg-surface-container-lowest overflow-y-auto p-lg">
        <div className="max-w-4xl mx-auto space-y-lg">
            {/* Connectivity Status */}
            <section className="space-y-md">
              <div className="border-b border-outline-variant pb-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface">Connectivity</h2>
              </div>
              <div className="border border-outline-variant bg-surface-container divide-y divide-outline-variant/50 rounded">
                {/* GitHub OAuth status */}
                <div className="flex items-center gap-md px-md py-sm">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${auth.authenticated ? "bg-green-400" : "bg-slate-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm">
                      <span className="text-body-main text-on-surface font-medium">GitHub Account</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded text-green-400 bg-green-400/10`}>Free models</span>
                      <div className="relative group">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-help">help</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-container-highest text-on-surface text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
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
                <div className="flex items-center gap-md px-md py-sm">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ghCliStatus?.connected ? "bg-green-400" : "bg-slate-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm">
                      <span className="text-body-main text-on-surface font-medium">GitHub Copilot (gh CLI)</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded text-violet-400 bg-violet-400/10`}>Pro models</span>
                      <div className="relative group">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-help">help</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-container-highest text-on-surface text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity w-72 z-50">
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
              <div className="flex items-center justify-between border-b border-outline-variant pb-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface">AI Model Configuration</h2>
                {saved && (
                  <span className="text-ui-small text-green-400 font-mono bg-green-400/10 px-2 py-0.5 rounded">
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
                    <div className="border border-outline-variant bg-surface-container divide-y divide-outline-variant/50 rounded">
                      {models.map((model) => (
                        <label
                          key={model.id}
                          className={`flex items-center gap-md px-md py-sm cursor-pointer transition-colors hover:bg-surface-container-high ${
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
                          <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                            settings.aiModel === model.id
                              ? "border-primary bg-primary"
                              : "border-outline"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-sm">
                              <span className="text-body-main text-on-surface font-medium">{model.name}</span>
                              <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded">{model.context}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                model.tier === "Free" ? "text-green-400 bg-green-400/10" :
                                "text-violet-400 bg-violet-400/10"
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
              <div className="flex items-center justify-between border-b border-outline-variant pb-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface">Storage</h2>
              </div>
              <div className="border border-outline-variant bg-surface-container p-md">
                <div className="flex items-center justify-between mb-md">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">cloud_queue</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">Storage Utilization</span>
                  </div>
                  {storage && (
                    <span className="text-ui-small font-mono text-on-surface">{formatBytes(storage.totalBytes)}</span>
                  )}
                </div>
                {storage && (
                  <>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-sm">
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
          </div>
        </main>
      </div>
  );
}
