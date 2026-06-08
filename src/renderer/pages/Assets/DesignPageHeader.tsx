import type { DesignStatus } from "./DesignPage.hooks";

interface HeaderProps {
  status: DesignStatus;
  stage: string;
  hasSaved: boolean;
  dirty: boolean;
  busy: boolean;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onUpload: () => void;
  onGenerate: () => void;
  onSave: () => void;
}

export function DesignPageHeader(props: HeaderProps) {
  const { status, stage, hasSaved, dirty, busy, enabled, onToggleEnabled, onUpload, onGenerate, onSave } = props;
  return (
    <header className="mb-lg flex items-start justify-between gap-4">
      <HeaderInfo status={status} stage={stage} hasSaved={hasSaved} enabled={enabled} dirty={dirty} onToggleEnabled={onToggleEnabled} />
      <div className="flex shrink-0 gap-2">
        <SecondaryButton onClick={onUpload} disabled={busy} icon="upload">Upload</SecondaryButton>
        <SecondaryButton onClick={onGenerate} disabled={busy} icon={status === "generating" ? "progress_activity" : "auto_awesome"} iconSpin={status === "generating"}>
          {status === "generating" ? "Generating…" : "Generate from site"}
        </SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={busy || !dirty} icon="save">
          {status === "saving" ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </header>
  );
}

interface InfoProps {
  status: DesignStatus; stage: string; hasSaved: boolean; enabled: boolean; dirty: boolean;
  onToggleEnabled: (next: boolean) => void;
}

function HeaderInfo({ status, stage, hasSaved, enabled, dirty, onToggleEnabled }: InfoProps) {
  return (
    <div>
      <div className="mb-xs flex items-center gap-3">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Design</h1>
        {hasSaved && <DesignToggle enabled={enabled} onChange={onToggleEnabled} />}
      </div>
      <p className="text-ui-small text-outline">
        A natural-language description of this project&apos;s design language. When enabled, it&apos;s injected into the AI editor&apos;s system prompt so every change stays on-brand.
      </p>
      <StatusLine status={status} stage={stage} dirty={dirty} />
    </div>
  );
}

function DesignToggle({ enabled, onChange }: { enabled: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable design spec" : "Enable design spec"}
      onClick={() => onChange(!enabled)}
      className={`flex h-5 w-9 cursor-pointer items-center rounded-full px-0.5 transition-colors ${enabled ? "justify-end bg-violet-500" : "justify-start bg-white/15"}`}
    >
      <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function statusText(status: DesignStatus, stage: string, dirty: boolean): string {
  if (status === "loading") return "Loading…";
  if (status === "generating") return stage || "Working…";
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved";
  if (dirty) return "Unsaved changes";
  return "";
}

function StatusLine({ status, stage, dirty }: { status: DesignStatus; stage: string; dirty: boolean }) {
  const text = statusText(status, stage, dirty);
  if (!text) return null;
  const showSpinner = status === "generating" || status === "saving" || status === "loading";
  return (
    <p className="text-outline mt-1 flex items-center gap-1.5 text-[11px]">
      {showSpinner && (
        <span className="material-symbols-outlined animate-spin text-violet-300" style={{ fontSize: 12 }}>progress_activity</span>
      )}
      <span>{text}</span>
    </p>
  );
}

interface ButtonProps { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon: string; iconSpin?: boolean }

function PrimaryButton({ children, onClick, disabled, icon }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-violet-600 px-3 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, icon, iconSpin }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-outline/30 text-on-surface hover:bg-surface-container flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className={`material-symbols-outlined ${iconSpin ? "animate-spin" : ""}`} style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </button>
  );
}
