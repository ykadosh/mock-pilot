import type { DesignStatus } from "./DesignPage.hooks";

interface HeaderProps {
  status: DesignStatus;
  hasSaved: boolean;
  dirty: boolean;
  busy: boolean;
  onUpload: () => void;
  onGenerate: () => void;
  onSave: () => void;
}

export function DesignPageHeader({ status, hasSaved, dirty, busy, onUpload, onGenerate, onSave }: HeaderProps) {
  return (
    <header className="mb-lg flex items-start justify-between gap-4">
      <HeaderInfo status={status} hasSaved={hasSaved} dirty={dirty} />
      <div className="flex shrink-0 gap-2">
        <SecondaryButton onClick={onUpload} disabled={busy} icon="upload">Upload</SecondaryButton>
        <SecondaryButton onClick={onGenerate} disabled={busy} icon="auto_awesome">
          {status === "generating" ? "Generating…" : "Generate from site"}
        </SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={busy || !dirty} icon="save">
          {status === "saving" ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </header>
  );
}

function HeaderInfo({ status, hasSaved, dirty }: { status: DesignStatus; hasSaved: boolean; dirty: boolean }) {
  return (
    <div>
      <div className="mb-xs flex items-center gap-2">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Design</h1>
        {hasSaved && (
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-violet-300 uppercase">
            Active
          </span>
        )}
      </div>
      <p className="text-ui-small text-outline">
        A natural-language description of this project&apos;s design language. Injected into the AI editor&apos;s system prompt so every change stays on-brand.
      </p>
      <StatusLine status={status} dirty={dirty} />
    </div>
  );
}

function StatusLine({ status, dirty }: { status: DesignStatus; dirty: boolean }) {
  let text = "";
  if (status === "loading") text = "Loading…";
  else if (status === "generating") text = "Analyzing captured site…";
  else if (status === "saved") text = "Saved";
  else if (dirty) text = "Unsaved changes";
  if (!text) return null;
  return <p className="text-outline mt-1 text-[11px]">{text}</p>;
}

interface ButtonProps { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon: string }

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

function SecondaryButton({ children, onClick, disabled, icon }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-outline/30 text-on-surface hover:bg-surface-container flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </button>
  );
}
