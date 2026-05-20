import type { ModelInfo } from "./AppSettings.utils";
import { getModelGroups, getTierClassName } from "./AppSettings.utils";

interface ModelConfigurationSectionProps {
  onModelChange: (modelId: string) => Promise<void>;
  saved: boolean;
  selectedModel: string;
}

export function ModelConfigurationSection({ onModelChange, saved, selectedModel }: ModelConfigurationSectionProps) {
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs flex items-center justify-between border-b"><h2 className="font-headline-md text-headline-md text-on-surface">AI Model Configuration</h2>{saved && <span className="text-ui-small rounded bg-green-400/10 px-2 py-0.5 font-mono text-green-400">Saved ✓</span>}</div>
      <p className="text-ui-small text-on-surface-variant"><span className="text-green-400">Free</span> models work with any GitHub account. <span className="text-violet-400">Pro</span> models require a GitHub Copilot Pro/Business subscription.</p>
      <div className="space-y-md">{getModelGroups().map(([publisher, models]) => <ModelPublisherGroup key={publisher} models={models} onModelChange={onModelChange} publisher={publisher} selectedModel={selectedModel} />)}</div>
    </section>
  );
}

interface ModelPublisherGroupProps extends ModelConfigurationSectionProps {
  models: ModelInfo[];
  publisher: string;
}

function ModelPublisherGroup({ models, onModelChange, publisher, selectedModel }: ModelPublisherGroupProps) {
  return (
    <div>
      <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">{publisher}</h3>
      <div className="border-outline-variant bg-surface-container divide-outline-variant/50 divide-y rounded border">{models.map((model) => <ModelOption key={model.id} model={model} onModelChange={onModelChange} selected={selectedModel === model.id} />)}</div>
    </div>
  );
}

function ModelOption({ model, onModelChange, selected }: { model: ModelInfo; onModelChange: (modelId: string) => Promise<void>; selected: boolean }) {
  const containerClassName = selected ? "bg-surface-container-high" : "";
  const indicatorClassName = selected ? "border-primary bg-primary" : "border-outline";
  return (
    <label className={`gap-md px-md py-sm hover:bg-surface-container-high flex cursor-pointer items-center transition-colors ${containerClassName}`}>
      <input type="radio" name="llm_model" checked={selected} onChange={() => void onModelChange(model.id)} className="sr-only" />
      <div className={`h-3 w-3 flex-shrink-0 rounded-full border-2 ${indicatorClassName}`} />
      <div className="min-w-0 flex-1">
        <div className="gap-sm flex items-center"><span className="text-body-main text-on-surface font-medium">{model.name}</span><span className="text-on-surface-variant bg-surface-container-highest rounded px-1.5 py-0.5 font-mono text-[10px]">{model.context}</span><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${getTierClassName(model.tier)}`}>{model.tier}</span></div>
        <div className="text-ui-small text-on-surface-variant truncate">{model.description}</div>
      </div>
    </label>
  );
}
