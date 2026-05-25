interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  children: React.ReactNode;
  className?: string;
}

export function ExportButton({ onClick, disabled, icon, children, className = "" }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-lg bg-primary-container/80 text-on-primary-container text-ui-small flex cursor-pointer items-center justify-center gap-2 py-2 font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {children}
    </button>
  );
}
