import { Dialog } from "../../components/ui/Dialog";

interface DeleteProjectDialogProps {
  open: boolean;
  projectTitle?: string;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteProjectDialog({
  open,
  projectTitle,
  onClose,
  onDelete,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">Delete Project</h2>
      <p className="text-body-main text-on-surface-variant mb-lg">
        Are you sure you want to delete <span className="text-on-surface font-medium">{projectTitle}</span>? This
        action cannot be undone.
      </p>
      <div className="gap-sm flex justify-end">
        <button
          onClick={onClose}
          className="px-md py-sm text-ui-small text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          className="bg-error-container text-on-error-container px-md py-sm font-ui-small text-ui-small cursor-pointer rounded-lg transition-all active:opacity-80"
        >
          Delete
        </button>
      </div>
    </Dialog>
  );
}
