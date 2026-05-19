import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AuthState {
  authenticated: boolean;
  login?: string;
  avatar_url?: string;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  startLogin: () => Promise<{ user_code: string; device_code: string } | null>;
  pollLogin: (deviceCode: string) => Promise<boolean>;
  setAuthenticated: (login: string, avatar_url?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthState(status: Omit<AuthState, "loading">): AuthState {
  return { ...status, loading: false };
}

function useAuthStatus(setState: Dispatch<SetStateAction<AuthState>>) {
  useEffect(() => {
    window.api.authGetStatus().then((status) => {
      setState(toAuthState(status));
    });
  }, [setState]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    loading: true,
  });

  useAuthStatus(setState);

  const startLogin = useCallback(async () => {
    const result = await window.api.authStartDeviceFlow();
    if (result.success && result.user_code && result.device_code) {
      return { user_code: result.user_code, device_code: result.device_code };
    }
    return null;
  }, []);

  const pollLogin = useCallback(async (deviceCode: string): Promise<boolean> => {
    const result = await window.api.authPollDeviceFlow(deviceCode);
    if (result.status === "success") {
      setState(toAuthState({ authenticated: true, login: result.login, avatar_url: result.avatar_url }));
      return true;
    }
    if (result.status === "error") {
      return true; // Stop polling
    }
    return false; // Keep polling
  }, []);

  const setAuthenticated = useCallback((login: string, avatar_url?: string) => {
    setState(toAuthState({ authenticated: true, login, avatar_url }));
  }, []);

  const logout = useCallback(async () => {
    await window.api.authLogout();
    setState({ authenticated: false, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, startLogin, pollLogin, setAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
