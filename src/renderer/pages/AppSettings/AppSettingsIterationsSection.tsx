const ITERATION_OPTIONS = [
  { value: 10, label: "10" },
  { value: 20, label: "20 (Default)" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 0, label: "Unlimited" },
];

interface AgentIterationsSectionProps {
  maxIterations: number;
  onMaxIterationsChange: (value: number) => Promise<void>;
  saved: boolean;
}

export function AgentIterationsSection({ maxIterations, onMaxIterationsChange, saved }: AgentIterationsSectionProps) {
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
        <h2 className="font-headline-md text-headline-md text-on-surface">Agent Iterations</h2>
        {saved && <span className="text-ui-small rounded bg-green-400/10 px-2 py-0.5 font-mono text-green-400">Saved ✓</span>}
      </div>
      <p className="text-ui-small text-on-surface-variant">
        Maximum number of iterations the AI agent can perform per request. Higher values allow more complex changes but take longer. Set to &quot;Unlimited&quot; to remove the limit.
      </p>
      <div className="border-outline-variant bg-surface-container divide-outline-variant/50 divide-y rounded border">
        {ITERATION_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`gap-md px-md py-sm hover:bg-surface-container-high relative flex cursor-pointer items-center transition-colors ${maxIterations === option.value ? "bg-surface-container-high" : ""}`}
          >
            <input
              type="radio"
              name="max_iterations"
              checked={maxIterations === option.value}
              onChange={() => void onMaxIterationsChange(option.value)}
              className="sr-only"
            />
            <div className={`h-3 w-3 flex-shrink-0 rounded-full border-2 ${maxIterations === option.value ? "border-primary bg-primary" : "border-outline"}`} />
            <span className="text-body-main text-on-surface font-medium">{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
