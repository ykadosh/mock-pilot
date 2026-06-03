import { Dialog } from "../../components/ui/Dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExitBlockerDialog({ open, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onClose} icon="warning" title="Leave while AI is working?" cancelLabel="Stay" confirmLabel="Leave and stop" confirmVariant="danger" onConfirm={onConfirm}>
      <p className="font-body-md text-body-md text-on-surface-variant">
        The AI agent is still processing your request. Leaving now will stop the current run and discard any unsaved progress.
      </p>
    </Dialog>
  );
}
