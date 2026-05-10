import { useEffect, useRef } from "react";

export interface CaptureStep {
  label: string;
  status: "waiting" | "in-progress" | "done";
}

interface CaptureProgressModalProps {
  steps: CaptureStep[];
  percentage: number;
  url: string;
  onCancel: () => void;
}

export function CaptureProgressModal({ steps, percentage, url, onCancel }: CaptureProgressModalProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep the current step visible
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active]");
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [steps]);

  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = url;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-[2px]">
      <div className="w-[480px] bg-surface-container border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-lg border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 border border-primary-container/40 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                rocket_launch
              </span>
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md text-on-surface">Capturing Snapshot</h2>
              <p className="text-ui-small text-on-surface-variant">Processing {hostname}…</p>
            </div>
          </div>
          <div className="text-headline-md font-code-block text-primary">{Math.round(percentage)}%</div>
        </div>

        {/* Body */}
        <div className="p-lg space-y-lg">
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full relative transition-all duration-300"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Status log */}
          <div className="space-y-xs">
            <label className="text-label-caps font-label-caps text-on-surface-variant mb-sm block">
              EXECUTION LOG
            </label>
            <div
              ref={logRef}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md font-code-block text-ui-small h-48 overflow-y-auto space-y-sm"
            >
              {steps.map((step, i) => (
                <div
                  key={i}
                  data-active={step.status === "in-progress" ? "" : undefined}
                  className={`flex items-center gap-md ${
                    step.status === "done"
                      ? "text-secondary"
                      : step.status === "in-progress"
                        ? "text-primary"
                        : "text-on-surface-variant opacity-40"
                  }`}
                >
                  {/* Icon */}
                  {step.status === "done" ? (
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : step.status === "in-progress" ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                  )}

                  {/* Label */}
                  <span>{step.label}</span>

                  {/* Status badge */}
                  <span className={`ml-auto ${step.status === "done" ? "text-on-surface-variant opacity-50" : ""}`}>
                    {step.status === "done"
                      ? "DONE"
                      : step.status === "in-progress"
                        ? "IN PROGRESS"
                        : "WAITING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-md bg-surface-container-low border-t border-outline-variant flex justify-end gap-md">
          <button
            onClick={onCancel}
            className="px-lg py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors font-ui-small cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
