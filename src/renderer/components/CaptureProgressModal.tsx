import { useEffect, useRef, type RefObject } from "react";

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

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getStepTone(status: CaptureStep["status"]) {
  if (status === "done") return "text-secondary";
  if (status === "in-progress") return "text-primary";
  return "text-on-surface-variant opacity-40";
}

function getStepLabel(status: CaptureStep["status"]) {
  if (status === "done") return "DONE";
  if (status === "in-progress") return "IN PROGRESS";
  return "WAITING";
}

function StepIcon({ status }: Pick<CaptureStep, "status">) {
  if (status === "done") {
    return (
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        check_circle
      </span>
    );
  }
  if (status === "in-progress") {
    return <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>;
  }
  return <span className="material-symbols-outlined text-[16px]">pending</span>;
}

function CaptureStepRow({ step, index }: { step: CaptureStep; index: number }) {
  const badgeClassName = step.status === "done" ? "ml-auto text-on-surface-variant opacity-50" : "ml-auto";
  return (
    <div key={index} data-active={step.status === "in-progress" ? "" : undefined} className={`gap-md flex items-center ${getStepTone(step.status)}`}>
      <StepIcon status={step.status} />
      <span>{step.label}</span>
      <span className={badgeClassName}>{getStepLabel(step.status)}</span>
    </div>
  );
}

function CaptureLog({ steps, logRef }: { steps: CaptureStep[]; logRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="space-y-xs">
      <label className="text-label-caps font-label-caps text-on-surface-variant mb-sm block">EXECUTION LOG</label>
      <div ref={logRef} className="bg-surface-container-lowest border-outline-variant p-md font-code-block text-ui-small space-y-sm h-48 overflow-y-auto rounded-lg border">
        {steps.map((step, index) => (
          <CaptureStepRow key={index} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}

export function CaptureProgressModal({ steps, percentage, url, onCancel }: CaptureProgressModalProps) {
  const logRef = useRef<HTMLDivElement>(null), hostname = getHostname(url);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active]");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [steps]);

  return (
    <div className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px]">
      <div className="bg-surface-container border-outline-variant flex w-[480px] flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="p-lg border-outline-variant flex items-center justify-between border-b">
          <div className="gap-md flex items-center">
            <div className="bg-primary-container/20 border-primary-container/40 flex h-10 w-10 items-center justify-center rounded-lg border">
              <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md text-on-surface">Capturing Snapshot</h2>
              <p className="text-ui-small text-on-surface-variant">Processing {hostname}…</p>
            </div>
          </div>
          <div className="text-headline-md font-code-block text-primary">{Math.round(percentage)}%</div>
        </div>
        <div className="p-lg space-y-lg">
          <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary-container relative h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}>
              <div className="absolute inset-0 animate-pulse bg-white/20" />
            </div>
          </div>
          <CaptureLog steps={steps} logRef={logRef} />
        </div>
        <div className="p-md bg-surface-container-low border-outline-variant gap-md flex justify-end border-t">
          <button onClick={onCancel} className="px-lg border-outline-variant text-on-surface hover:bg-surface-container-highest font-ui-small cursor-pointer rounded border py-2 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
