interface TopNavAuthButtonProps {
  authenticated: boolean;
  avatarUrl?: string;
  login?: string;
  onClick: () => void;
}

function renderAuthIcon(authenticated: boolean, avatarUrl?: string, login?: string) {
  if (authenticated && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={login}
        className="h-6 w-6 border-2 border-green-500"
        style={{ borderRadius: "50%" }}
      />
    );
  }

  const iconClassName = authenticated
    ? "material-symbols-outlined text-green-400"
    : "material-symbols-outlined text-slate-400 transition-colors hover:text-white";

  return <span className={iconClassName}>account_circle</span>;
}

export function TopNavAuthButton({ authenticated, avatarUrl, login, onClick }: TopNavAuthButtonProps) {
  return (
    <button onClick={onClick} className="flex cursor-pointer items-center">
      {renderAuthIcon(authenticated, avatarUrl, login)}
    </button>
  );
}
