import { execFile, execSync } from "node:child_process";
import { promisify } from "node:util";
import { ipcMain, shell } from "electron";
import { loadAuth, saveAuth, clearAuth, isExplicitlyLoggedOut, GITHUB_CLIENT_ID, shellEnv } from "../auth";
import type { AuthData } from "../auth";

async function handleAuthGetStatus() {
  const auth = loadAuth();
  if (auth) return { authenticated: true, login: auth.login, avatar_url: auth.avatar_url };
  if (isExplicitlyLoggedOut()) return { authenticated: false };
  try {
    const token = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
    if (!token) return { authenticated: false };
    const res = await fetch("https://api.github.com/user", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return { authenticated: false };
    const user = await res.json();
    saveAuth({ token, login: user.login, avatar_url: user.avatar_url } satisfies AuthData);
    return { authenticated: true, login: user.login, avatar_url: user.avatar_url };
  } catch {
    return { authenticated: false };
  }
}

async function handleAuthStartDeviceFlow() {
  try {
    const body = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: "" });
    const res = await fetch("https://github.com/login/device/code", {
      method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
    });
    if (!res.ok) return { success: false, error: "Failed to start device flow" };
    const data = await res.json();
    shell.openExternal(data.verification_uri);
    return { success: true, user_code: data.user_code, device_code: data.device_code, interval: data.interval || 5, expires_in: data.expires_in };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function handleAuthPollDeviceFlow(_event: Electron.IpcMainInvokeEvent, deviceCode: string) {
  try {
    const body = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" });
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
    });
    const data = await res.json();
    if (data.error === "authorization_pending") return { status: "pending" };
    if (data.error === "slow_down") return { status: "slow_down" };
    if (data.error) return { status: "error", error: data.error_description || data.error };
    if (!data.access_token) return { status: "error", error: "Unexpected response" };
    const userRes = await fetch("https://api.github.com/user", { headers: { "Authorization": `Bearer ${data.access_token}` } });
    const user = await userRes.json();
    const authData: AuthData = { token: data.access_token, login: user.login || "User", avatar_url: user.avatar_url };
    saveAuth(authData);
    return { status: "success", login: authData.login, avatar_url: authData.avatar_url };
  } catch (error: unknown) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function handleAuthLogout() {
  clearAuth();
  return { success: true };
}

async function handleAuthCheckGhCli() {
  const execFileAsync = promisify(execFile);
  try {
    const { stdout: token } = await execFileAsync("gh", ["auth", "token"], { encoding: "utf-8", env: shellEnv });
    if (!token.trim()) return { connected: false };
    const { stdout: userJson } = await execFileAsync("gh", ["api", "user"], { encoding: "utf-8", env: shellEnv });
    const user = JSON.parse(userJson.trim());
    return { connected: true, login: user.login };
  } catch {
    return { connected: false };
  }
}

export function registerAuthHandlers() {
  ipcMain.handle("auth-get-status", handleAuthGetStatus);
  ipcMain.handle("auth-start-device-flow", handleAuthStartDeviceFlow);
  ipcMain.handle("auth-poll-device-flow", handleAuthPollDeviceFlow);
  ipcMain.handle("auth-logout", handleAuthLogout);
  ipcMain.handle("auth-check-gh-cli", handleAuthCheckGhCli);
}
