import type { ReactNode} from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

type ActiveTab = "editor" | "assets" | "settings" | "export" | "code-editor";

const pageTabs: { label: string; key: ActiveTab; to: string; icon: string }[] = [
  { label: "Editor", key: "editor", to: "/editor", icon: "edit" },
  { label: "Code Editor", key: "code-editor", to: "/code-editor", icon: "code" },
  { label: "Assets", key: "assets", to: "/assets", icon: "widgets" },
  { label: "Export", key: "export", to: "/export", icon: "ios_share" },
  { label: "Settings", key: "settings", to: "/settings", icon: "settings" },
];

interface TopNavProps {
  children?: ReactNode;
  activeTab?: ActiveTab;
  projectId?: string;
}

export function TopNav({ children, activeTab, projectId }: TopNavProps) {
  const navigate = useNavigate();
  const auth = useAuth();

  const getTabRoute = (tab: typeof pageTabs[0]) => {
    if (projectId) return `${tab.to}/${projectId}`;
    return tab.to;
  };
  const [showLoginFlow, setShowLoginFlow] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [polling, setPolling] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loginError, setLoginError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLoginClick = async () => {
    if (auth.authenticated) {
      setShowUserMenu((prev) => !prev);
      return;
    }
    if (showLoginFlow) return; // Already showing login
    setLoginError("");
    try {
      const result = await auth.startLogin();
      if (result) {
        setUserCode(result.user_code);
        setDeviceCode(result.device_code);
        setShowLoginFlow(true);
        setPolling(true);
      } else {
        setLoginError("Failed to start login flow. Please try again.");
        setShowLoginFlow(true);
      }
    } catch {
      setLoginError("Failed to connect to GitHub. Please try again.");
      setShowLoginFlow(true);
    }
  };

  // Poll for auth completion
  const pollIntervalRef = useRef(10000);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!polling || !deviceCode) return;

    const poll = async () => {
      const result = await window.api.authPollDeviceFlow(deviceCode);
      if (result.status === "success") {
        auth.setAuthenticated(result.login || "User", result.avatar_url);
        setPolling(false);
        setShowLoginFlow(false);
        setUserCode("");
        setDeviceCode("");
      } else if (result.status === "slow_down") {
        pollIntervalRef.current += 5000;
        pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
      } else if (result.status === "error") {
        setPolling(false);
        setLoginError(result.error || "Authentication failed");
      } else {
        // pending - keep polling
        pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
      }
    };

    pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [polling, deviceCode]);

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
      <header className="relative z-50 flex h-12 w-full shrink-0 items-center border-b border-slate-700 bg-slate-900 pr-4 pl-20 text-sm tracking-tight [-webkit-app-region:drag]">
        <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
          <span
            onClick={() => navigate("/")}
            className="cursor-pointer text-lg font-bold tracking-tighter text-slate-50"
          >
            MockPilot
          </span>
        </div>
        {activeTab && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 [-webkit-app-region:no-drag]">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate(getTabRoute(tab))}
                className={`flex cursor-pointer items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors ${
                  tab.key === activeTab
                    ? "bg-slate-800 text-violet-400"
                    : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                <span className="material-symbols-outlined leading-none" style={{ fontSize: 18 }}>{tab.icon}</span>
                <span className="translate-y-px">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="gap-md ml-auto flex items-center [-webkit-app-region:no-drag]">
          {children}
          <div className="gap-sm flex items-center">
            <button
              onClick={() => navigate("/app-settings")}
              className="material-symbols-outlined cursor-pointer text-slate-400 transition-colors hover:text-white"
            >
              settings
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleLoginClick}
                className="flex cursor-pointer items-center"
              >
                {auth.authenticated && auth.avatar_url ? (
                  <img
                    src={auth.avatar_url}
                    alt={auth.login}
                    className="h-6 w-6 border-2 border-green-500"
                    style={{ borderRadius: "50%" }}
                  />
                ) : auth.authenticated ? (
                  <span className="material-symbols-outlined text-green-400">account_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-slate-400 transition-colors hover:text-white">account_circle</span>
                )}
              </button>
              {showUserMenu && auth.authenticated && (
                <div className="absolute top-10 right-0 z-50 w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
                  <div className="mb-2 flex items-center gap-2 border-b border-slate-700 pb-2">
                    {auth.avatar_url && (
                      <img src={auth.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{auth.login}</p>
                      <p className="text-[10px] text-green-400">Connected</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await auth.logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-xs text-red-400 hover:bg-slate-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Login flow modal */}
      {showLoginFlow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-slate-700 bg-slate-800 p-6 text-center shadow-2xl">
            <span className="material-symbols-outlined mb-3 block text-4xl text-violet-400">key</span>
            <h3 className="mb-2 text-lg font-bold text-white">Sign in with GitHub</h3>
            {loginError ? (
              <>
                <p className="mb-4 text-sm text-red-400">{loginError}</p>
                <button
                  onClick={() => {
                    setShowLoginFlow(false);
                    setLoginError("");
                  }}
                  className="cursor-pointer text-xs text-slate-500 hover:text-slate-300"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  Enter this code on GitHub:
                </p>
                <div className="mb-4 rounded-lg bg-slate-900 px-4 py-3">
                  <code className="font-mono text-2xl font-bold tracking-widest text-violet-300 select-all">
                    {userCode}
                  </code>
                </div>
                <p className="mb-4 text-xs text-slate-500">
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
                  className="mt-4 cursor-pointer text-xs text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
