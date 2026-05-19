import { ipcMain, shell } from "electron";

import { loadAuth, saveAuth, clearAuth, isExplicitlyLoggedOut, GITHUB_CLIENT_ID, shellEnv } from "./auth";
import type { AuthData } from "./auth";

export function registerAuthHandlers() {
  ipcMain.handle("auth-get-status", async () => {
    const auth = loadAuth();
    if (auth) {
      return { authenticated: true, login: auth.login, avatar_url: auth.avatar_url };
    }
    // Don't fall back to gh CLI if user explicitly logged out
    if (isExplicitlyLoggedOut()) {
      return { authenticated: false };
    }
    // Fallback: check gh CLI
    try {
      const { execSync } = require("child_process");
      const token = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
      if (token) {
        // Fetch user info with this token
        const res = await fetch("https://api.github.com/user", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          // Save it so we don't need to check CLI again
          const authData: AuthData = { token, login: user.login, avatar_url: user.avatar_url };
          saveAuth(authData);
          return { authenticated: true, login: user.login, avatar_url: user.avatar_url };
        }
      }
    } catch { /* gh not available */ }
    return { authenticated: false };
  });

  ipcMain.handle("auth-start-device-flow", async () => {
    try {
      const body = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        scope: "",
      });
      const res = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!res.ok) return { success: false, error: "Failed to start device flow" };
      const data = await res.json();
      // Open the verification URL in the user's browser
      shell.openExternal(data.verification_uri);
      return {
        success: true,
        user_code: data.user_code,
        device_code: data.device_code,
        interval: data.interval || 5,
        expires_in: data.expires_in,
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("auth-poll-device-flow", async (_event, deviceCode: string) => {
    try {
      const body = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const data = await res.json();
      console.log("Poll response:", JSON.stringify(data));

      if (data.error === "authorization_pending") {
        return { status: "pending" };
      } else if (data.error === "slow_down") {
        return { status: "slow_down" };
      } else if (data.error) {
        return { status: "error", error: data.error_description || data.error };
      } else if (data.access_token) {
        // Get user info
        const userRes = await fetch("https://api.github.com/user", {
          headers: { "Authorization": `Bearer ${data.access_token}` },
        });
        const user = await userRes.json();
        const authData: AuthData = {
          token: data.access_token,
          login: user.login || "User",
          avatar_url: user.avatar_url,
        };
        saveAuth(authData);
        return { status: "success", login: authData.login, avatar_url: authData.avatar_url };
      }
      return { status: "error", error: "Unexpected response" };
    } catch (error: unknown) {
      return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("auth-logout", () => {
    clearAuth();
    return { success: true };
  });

  ipcMain.handle("auth-check-gh-cli", async () => {
    const { execFile } = require("child_process");
    const { promisify } = require("util");
    const execFileAsync = promisify(execFile);
    try {
      const { stdout: token } = await execFileAsync("gh", ["auth", "token"], { encoding: "utf-8", env: shellEnv });
      if (token.trim()) {
        const { stdout: userJson } = await execFileAsync("gh", ["api", "user"], { encoding: "utf-8", env: shellEnv });
        const user = JSON.parse(userJson.trim());
        return { connected: true, login: user.login };
      }
    } catch { /* gh not available or not authenticated */ }
    return { connected: false };
  });
}
