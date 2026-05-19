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
    <div className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px]">
      <div className="bg-surface-container border-outline-variant flex w-[480px] flex-col overflow-hidden rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="p-lg border-outline-variant flex items-center justify-between border-b">
          <div className="gap-md flex items-center">
            <div className="bg-primary-container/20 border-primary-container/40 flex h-10 w-10 items-center justify-center rounded-lg border">
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
          <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary-container relative h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 animate-pulse bg-white/20" />
            </div>
          </div>

          {/* Status log */}
          <div className="space-y-xs">
            <label className="text-label-caps font-label-caps text-on-surface-variant mb-sm block">
              EXECUTION LOG
            </label>
            <div
              ref={logRef}
              className="bg-surface-container-lowest border-outline-variant p-md font-code-block text-ui-small space-y-sm h-48 overflow-y-auto rounded-lg border"
            >
              {steps.map((step, i) => (
                <div
                  key={i}
                  data-active={step.status === "in-progress" ? "" : undefined}
                  className={`gap-md flex items-center ${
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
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
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
        <div className="p-md bg-surface-container-low border-outline-variant gap-md flex justify-end border-t">
          <button
            onClick={onCancel}
            className="px-lg border-outline-variant text-on-surface hover:bg-surface-container-highest font-ui-small cursor-pointer rounded border py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
