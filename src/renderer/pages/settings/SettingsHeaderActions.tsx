interface SettingsHeaderActionsProps {
  hasChanges: boolean;
  nameSaved: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function SettingsHeaderActions({
  hasChanges,
  nameSaved,
  onDiscard,
  onSave,
}: SettingsHeaderActionsProps) {
  return (
    <>
      <button
        onClick={onDiscard}
        disabled={!hasChanges}
        className="px-md py-sm text-ui-small text-on-surface border-outline hover:bg-surface-container-high cursor-pointer border font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Discard
      </button>
      <button
        onClick={onSave}
        disabled={!hasChanges}
        className="px-md py-sm text-ui-small bg-primary-container cursor-pointer font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {nameSaved ? "Saved ✓" : "Save Changes"}
      </button>
    </>
  );
}
