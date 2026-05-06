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
  // OpenAI
  { id: "openai/gpt-4.1", name: "GPT-4.1", publisher: "OpenAI", description: "Top coding, instruction following, and long-context understanding." },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", publisher: "OpenAI", description: "Efficient variant with strong coding and long-context handling." },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", publisher: "OpenAI", description: "Lower latency and cost with solid performance." },
  { id: "openai/gpt-4o", name: "GPT-4o", publisher: "OpenAI", description: "Advanced multimodal model for text and image tasks." },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", publisher: "OpenAI", description: "Affordable multimodal for diverse tasks." },
  { id: "openai/o4-mini", name: "o4-mini", publisher: "OpenAI", description: "Improved reasoning with tool calling support." },
  { id: "openai/o3", name: "o3", publisher: "OpenAI", description: "Advanced reasoning with streaming and tool use." },
  { id: "openai/o3-mini", name: "o3-mini", publisher: "OpenAI", description: "Cost-efficient reasoning model." },
  // Anthropic (available via GitHub Models API)
  // Meta
  { id: "meta/llama-4-maverick-17b-128e-instruct-fp8", name: "Llama 4 Maverick", publisher: "Meta", description: "Precise image understanding and creative writing." },
  { id: "meta/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", publisher: "Meta", description: "Multi-document summarization and codebase reasoning." },
  { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", publisher: "Meta", description: "Enhanced reasoning with performance comparable to Llama 3.1 405B." },
  // DeepSeek
  { id: "deepseek/deepseek-r1-0528", name: "DeepSeek R1", publisher: "DeepSeek", description: "Improved reasoning with reduced hallucination and function calling." },
  { id: "deepseek/deepseek-v3-0324", name: "DeepSeek V3", publisher: "DeepSeek", description: "Enhanced reasoning, function calling, and code generation." },
  // Mistral
  { id: "mistral-ai/mistral-medium-2505", name: "Mistral Medium 3", publisher: "Mistral AI", description: "Advanced reasoning, knowledge, coding and vision." },
  { id: "mistral-ai/mistral-small-2503", name: "Mistral Small 3.1", publisher: "Mistral AI", description: "Multimodal with 128k context length." },
  { id: "mistral-ai/codestral-2501", name: "Codestral", publisher: "Mistral AI", description: "Code generation optimized, supports 80+ languages." },
  // xAI
  { id: "xai/grok-3", name: "Grok 3", publisher: "xAI", description: "Excels in specialized domains like finance and healthcare." },
  { id: "xai/grok-3-mini", name: "Grok 3 Mini", publisher: "xAI", description: "Lightweight reasoning model for logic-based tasks." },
  // Microsoft
  { id: "microsoft/phi-4-reasoning", name: "Phi-4 Reasoning", publisher: "Microsoft", description: "State-of-the-art open-weight reasoning model." },
  { id: "microsoft/phi-4", name: "Phi-4", publisher: "Microsoft", description: "14B parameter model for low latency scenarios." },
  // Cohere
  { id: "cohere/cohere-command-a", name: "Command A", publisher: "Cohere", description: "Efficient model for agentic and multilingual use cases." },
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
                            <div className="text-body-main text-on-surface font-medium">{model.name}</div>
                            <div className="text-ui-small text-on-surface-variant truncate">{model.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
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
