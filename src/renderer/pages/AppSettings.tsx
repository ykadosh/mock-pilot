import { useEffect, useState } from "react";
import { TopNav } from "../components/layout/TopNav";

interface StorageInfo {
  totalBytes: number;
  projectCount: number;
}

interface AppSettingsData {
  aiModel: string;
}

const AI_MODELS = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    icon: "bolt",
    iconColor: "text-primary",
    description: "Multimodal powerhouse for complex reasoning and creative tasks.",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    icon: "auto_awesome",
    iconColor: "text-secondary",
    description: "Balanced performance with exceptional coding and nuance handling.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    icon: "rocket_launch",
    iconColor: "text-tertiary",
    description: "Optimized for massive context windows and deep document analysis.",
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function AppSettings() {
  const [settings, setSettings] = useState<AppSettingsData>({ aiModel: "openai/gpt-4o" });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api.getAppSettings().then((s) => {
      if (s) setSettings(s);
    });
    window.api.getStorageInfo().then(setStorage);
  }, []);

  const handleModelChange = async (modelId: string) => {
    const updated = { ...settings, aiModel: modelId };
    setSettings(updated);
    await window.api.saveAppSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <main className="flex-1 min-w-0 bg-surface-container-lowest overflow-y-auto p-lg">
          <div className="max-w-4xl mx-auto space-y-lg">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {AI_MODELS.map((model) => (
                  <label key={model.id} className="relative group cursor-pointer">
                    <input
                      type="radio"
                      name="llm_model"
                      checked={settings.aiModel === model.id}
                      onChange={() => handleModelChange(model.id)}
                      className="peer sr-only"
                    />
                    <div className="h-full border border-outline-variant bg-surface-container p-md peer-checked:border-primary peer-checked:bg-surface-container-high transition-all">
                      <div className="flex justify-between items-start mb-sm">
                        <span className={`material-symbols-outlined ${model.iconColor}`}>{model.icon}</span>
                        <div className="w-2 h-2 rounded-full bg-primary hidden peer-checked:block"></div>
                      </div>
                      <div className="font-headline-md text-headline-md text-on-surface">{model.name}</div>
                      <div className="text-ui-small text-on-surface-variant mt-xs">{model.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Storage */}
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
    </div>
  );
}
