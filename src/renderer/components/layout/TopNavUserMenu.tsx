interface TopNavUserMenuProps {
  avatarUrl?: string;
  login?: string;
  onLogout: () => Promise<void>;
}

export function TopNavUserMenu({ avatarUrl, login, onLogout }: TopNavUserMenuProps) {
  return (
    <div className="absolute top-10 right-0 z-50 w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
      <div className="mb-2 flex items-center gap-2 border-b border-slate-700 pb-2">
        {avatarUrl && <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-200">{login}</p>
          <p className="text-[10px] text-green-400">Connected</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-xs text-red-400 hover:bg-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}
