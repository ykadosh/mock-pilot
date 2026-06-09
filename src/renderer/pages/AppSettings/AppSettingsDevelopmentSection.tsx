interface AppSettingsDevelopmentSectionProps {
  auditMode: boolean;
  onAuditModeChange: (value: boolean) => Promise<void>;
  saved: boolean;
}

export function AppSettingsDevelopmentSection({ auditMode, onAuditModeChange, saved }: AppSettingsDevelopmentSectionProps) {
  return (
    <section className="space-y-md">
      <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
        <h2 className="font-headline-md text-headline-md text-on-surface">Development</h2>
        {saved && <span className="text-ui-small rounded bg-green-400/10 px-2 py-0.5 font-mono text-green-400">Saved ✓</span>}
      </div>
      <p className="text-ui-small text-on-surface-variant">
        Tools intended for working on MockPilot itself. Only visible when running the app in development mode.
      </p>
      <div className="border-outline-variant bg-surface-container rounded border">
        <label className="gap-md px-md py-sm hover:bg-surface-container-high relative flex cursor-pointer items-start transition-colors">
          <input
            type="checkbox"
            checked={auditMode}
            onChange={(e) => void onAuditModeChange(e.target.checked)}
            className="sr-only"
          />
          <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-sm border-2 ${auditMode ? "border-primary bg-primary" : "border-outline"}`} />
          <div className="space-y-xs flex-1">
            <div className="text-body-main text-on-surface font-medium">Audit mode</div>
            <p className="text-ui-small text-on-surface-variant">
              After every agent run, automatically fire a second LLM call that critiques the agent (system prompt, tools, phase rules) against the run trace. The report is saved under <code className="rounded bg-black/20 px-1 font-mono">audit-reports/</code> and printed to the terminal. Costs an extra LLM call per run.
            </p>
          </div>
        </label>
      </div>
    </section>
  );
}
