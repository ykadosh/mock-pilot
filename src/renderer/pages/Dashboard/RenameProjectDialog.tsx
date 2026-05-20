import { Dialog } from "../../components/ui/Dialog";
import type { SavedProject } from "./Dashboard.types";

interface RenameProjectDialogProps {
  project: SavedProject | null;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function RenameProjectDialog({
  project,
  value,
  onChange,
  onClose,
  onSubmit,
}: RenameProjectDialogProps) {
  return (
    <Dialog open={!!project} onClose={onClose}>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">Rename Project</h2>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Project name"
        className="bg-surface-container-lowest border-outline-variant/50 px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:border-primary mb-sm w-full rounded-lg border transition-colors focus:outline-none"
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && value.trim()) onSubmit();
        }}
      />
      <div className="mt-md flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small cursor-pointer rounded-lg transition-all active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rename
        </button>
      </div>
    </Dialog>
  );
}
