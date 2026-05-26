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
    <Dialog
      open={open}
      onClose={onClose}
      icon="delete_forever"
      title="Delete Project"
      confirmLabel="Delete"
      confirmVariant="danger"
      onConfirm={onDelete}
    >
      <p className="text-body-main text-on-surface-variant">
        Are you sure you want to delete <span className="text-on-surface font-medium">{projectTitle}</span>? This
        action cannot be undone.
      </p>
    </Dialog>
  );
}
