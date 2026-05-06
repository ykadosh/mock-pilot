import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface TopNavProps {
  children?: ReactNode;
}

export function TopNav({ children }: TopNavProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [showLoginFlow, setShowLoginFlow] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [polling, setPolling] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLoginClick = async () => {
    if (auth.authenticated) {
      setShowUserMenu((prev) => !prev);
      return;
    }
    const result = await auth.startLogin();
    if (result) {
      setUserCode(result.user_code);
      setDeviceCode(result.device_code);
      setShowLoginFlow(true);
      setPolling(true);
    }
  };

  // Poll for auth completion
  useEffect(() => {
    if (!polling || !deviceCode) return;
    const interval = setInterval(async () => {
      const done = await auth.pollLogin(deviceCode);
      if (done) {
        setPolling(false);
        setShowLoginFlow(false);
        setUserCode("");
        setDeviceCode("");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, deviceCode, auth.pollLogin]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-700 flex justify-between items-center pl-20 pr-4 h-12 w-full fixed top-0 z-50 text-sm tracking-tight [-webkit-app-region:drag]">
        <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
          <span
            onClick={() => navigate("/")}
            className="text-lg font-bold tracking-tighter text-slate-50 cursor-pointer"
          >
            MockPilot
          </span>
        </div>
        <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
          {children}
          <div className="flex items-center gap-sm">
            <button className="material-symbols-outlined text-slate-400 hover:text-white transition-colors cursor-pointer">
              notifications
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleLoginClick}
                className="flex items-center cursor-pointer"
              >
                {auth.authenticated && auth.avatar_url ? (
                  <img
                    src={auth.avatar_url}
                    alt={auth.login}
                    className="w-7 h-7 rounded-full border-2 border-green-500"
                  />
                ) : auth.authenticated ? (
                  <span className="material-symbols-outlined text-green-400">account_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">account_circle</span>
                )}
              </button>
              {showUserMenu && auth.authenticated && (
                <div className="absolute right-0 top-10 z-50 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 px-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-700 mb-2">
                    {auth.avatar_url && (
                      <img src={auth.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-slate-200 font-medium truncate">{auth.login}</p>
                      <p className="text-[10px] text-green-400">Connected</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await auth.logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left text-xs text-red-400 hover:bg-slate-700 px-2 py-1.5 rounded cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          <button className="bg-primary-container text-on-primary-container px-md py-1.5 font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all">
            Deploy Changes
          </button>
        </div>
      </header>

      {/* Login flow modal */}
      {showLoginFlow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-80 text-center shadow-2xl">
            <span className="material-symbols-outlined text-4xl text-violet-400 mb-3 block">key</span>
            <h3 className="text-lg font-bold text-white mb-2">Sign in with GitHub</h3>
            <p className="text-sm text-slate-400 mb-4">
              Enter this code on GitHub:
            </p>
            <div className="bg-slate-900 rounded-lg px-4 py-3 mb-4">
              <code className="text-2xl font-mono font-bold text-violet-300 tracking-widest select-all">
                {userCode}
              </code>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              A browser window has been opened. Paste the code above to complete sign-in.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              Waiting for authorization...
            </div>
            <button
              onClick={() => {
                setShowLoginFlow(false);
                setPolling(false);
              }}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
