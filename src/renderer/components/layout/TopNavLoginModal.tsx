interface TopNavLoginModalProps {
  loginError: string;
  userCode: string;
  onClose: () => void;
  onCancel: () => void;
}

function TopNavLoginError({ loginError, onClose }: Pick<TopNavLoginModalProps, "loginError" | "onClose">) {
  return (
    <>
      <p className="mb-4 text-sm text-red-400">{loginError}</p>
      <button onClick={onClose} className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
        Close
      </button>
    </>
  );
}

function TopNavLoginPending({ userCode, onCancel }: Pick<TopNavLoginModalProps, "userCode" | "onCancel">) {
  return (
    <>
      <p className="mb-4 text-sm text-slate-400">Enter this code on GitHub:</p>
      <div className="mb-4 rounded-lg bg-slate-900 px-4 py-3">
        <code className="font-mono text-2xl font-bold tracking-widest text-violet-300 select-all">{userCode}</code>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        A browser window has been opened. Paste the code above to complete sign-in.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
        Waiting for authorization...
      </div>
      <button onClick={onCancel} className="mt-4 cursor-pointer text-xs text-slate-500 hover:text-slate-300">
        Cancel
      </button>
    </>
  );
}

export function TopNavLoginModal({ loginError, onClose, onCancel, userCode }: TopNavLoginModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-xl border border-slate-700 bg-slate-800 p-6 text-center shadow-2xl">
        <span className="material-symbols-outlined mb-3 block text-4xl text-violet-400">key</span>
        <h3 className="mb-2 text-lg font-bold text-white">Sign in with GitHub</h3>
        {loginError
          ? <TopNavLoginError loginError={loginError} onClose={onClose} />
          : <TopNavLoginPending userCode={userCode} onCancel={onCancel} />}
      </div>
    </div>
  );
}
