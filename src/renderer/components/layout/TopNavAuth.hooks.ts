import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

interface TopNavAuthState {
  deviceCode: string;
  loginError: string;
  polling: boolean;
  showLoginFlow: boolean;
  showUserMenu: boolean;
  userCode: string;
}

const initialState: TopNavAuthState = {
  deviceCode: "",
  loginError: "",
  polling: false,
  showLoginFlow: false,
  showUserMenu: false,
  userCode: "",
};

function useDismissOnOutsideClick(
  menuRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [enabled, menuRef, onClose]);
}

interface UseAuthPollingOptions {
  deviceCode: string;
  polling: boolean;
  pollIntervalRef: React.MutableRefObject<number>;
  onError: (message: string) => void;
  onSuccess: (login: string, avatarUrl?: string) => void;
}

function useAuthPolling({ deviceCode, onError, onSuccess, pollIntervalRef, polling }: UseAuthPollingOptions) {
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!polling || !deviceCode) return;

    let disposed = false;
    const scheduleNextPoll = (poll: () => Promise<void>) => {
      pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
    };
    const poll = async () => {
      const result = await window.api.authPollDeviceFlow(deviceCode);
      if (disposed) return;
      if (result.status === "success") return onSuccess(result.login || "User", result.avatar_url);
      if (result.status === "slow_down") pollIntervalRef.current += 5000;
      if (result.status === "error") return onError(result.error || "Authentication failed");
      scheduleNextPoll(poll);
    };

    scheduleNextPoll(poll);
    return () => {
      disposed = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [deviceCode, onError, onSuccess, pollIntervalRef, polling]);
}

export function useTopNavAuth() {
  const { authenticated, avatar_url, login, logout, setAuthenticated, startLogin } = useAuth();
  const [state, setState] = useState(initialState);
  const menuRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef(10000);

  const closeUserMenu = useCallback(() => setState((current) => ({ ...current, showUserMenu: false })), []);
  const handlePollError = useCallback((message: string) => setState((current) => ({ ...current, loginError: message, polling: false })), []);
  const handlePollSuccess = useCallback((nextLogin: string, nextAvatarUrl?: string) => {
    setAuthenticated(nextLogin, nextAvatarUrl);
    pollIntervalRef.current = 10000;
    setState((current) => ({ ...current, deviceCode: "", polling: false, showLoginFlow: false, userCode: "" }));
  }, [setAuthenticated]);

  useDismissOnOutsideClick(menuRef, state.showUserMenu, closeUserMenu);
  useAuthPolling({
    deviceCode: state.deviceCode,
    polling: state.polling,
    pollIntervalRef,
    onError: handlePollError,
    onSuccess: handlePollSuccess,
  });

  const handleLoginClick = useCallback(async () => {
    if (authenticated) return setState((current) => ({ ...current, showUserMenu: !current.showUserMenu }));
    if (state.showLoginFlow) return;
    pollIntervalRef.current = 10000;
    try {
      const result = await startLogin();
      if (!result) return setState((current) => ({ ...current, loginError: "Failed to start login flow. Please try again.", showLoginFlow: true }));
      setState((current) => ({ ...current, deviceCode: result.device_code, loginError: "", polling: true, showLoginFlow: true, userCode: result.user_code }));
    } catch {
      setState((current) => ({ ...current, loginError: "Failed to connect to GitHub. Please try again.", showLoginFlow: true }));
    }
  }, [authenticated, startLogin, state.showLoginFlow]);

  const handleLogout = useCallback(async () => {
    await logout();
    closeUserMenu();
  }, [closeUserMenu, logout]);
  const handleCloseLoginFlow = useCallback(() => setState((current) => ({ ...current, loginError: "", showLoginFlow: false })), []);
  const handleCancelLoginFlow = useCallback(() => setState((current) => ({ ...current, polling: false, showLoginFlow: false })), []);

  return { ...state, authenticated, avatarUrl: avatar_url, handleCancelLoginFlow, handleCloseLoginFlow, handleLoginClick, handleLogout, login, menuRef };
}
