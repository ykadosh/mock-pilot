import { app } from "electron";
import path from "path";
import fs from "fs";

const GITHUB_CLIENT_ID = "Ov23liwdxHGMy1H6hPRx";

const authFilePath = path.join(app.getPath("userData"), "github-auth.json");
const loggedOutMarker = path.join(app.getPath("userData"), "github-logged-out");

// Packaged Electron apps don't inherit the user's shell PATH,
// so we augment it with common install locations for CLI tools like `gh`.
const shellEnv = {
  ...process.env,
  PATH: `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.HOME || ""}/.local/bin`,
};

export interface AuthData {
  token: string;
  login: string;
  avatar_url?: string;
}

export function loadAuth(): AuthData | null {
  try {
    if (fs.existsSync(authFilePath)) {
      return JSON.parse(fs.readFileSync(authFilePath, "utf-8"));
    }
  } catch { /* ignore */ }
  return null;
}

export function saveAuth(data: AuthData) {
  fs.writeFileSync(authFilePath, JSON.stringify(data), "utf-8");
  // Clear logged-out marker when explicitly saving auth
  try { fs.unlinkSync(loggedOutMarker); } catch { /* ignore */ }
}

export function clearAuth() {
  try { fs.unlinkSync(authFilePath); } catch { /* ignore */ }
  // Set logged-out marker so we don't re-import from gh CLI
  fs.writeFileSync(loggedOutMarker, "", "utf-8");
}

export function isExplicitlyLoggedOut(): boolean {
  return fs.existsSync(loggedOutMarker);
}

export function getToken(): string | null {
  const auth = loadAuth();
  if (auth?.token) return auth.token;
  if (isExplicitlyLoggedOut()) return null;
  // Fallback: try gh CLI if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process");
    const token = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
    if (token) return token;
  } catch { /* gh not available */ }
  return null;
}

let copilotTokenCache: { token: string; expiresAt: number } | null = null;

export async function exchangeCopilotToken(githubToken: string): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (copilotTokenCache && Date.now() < copilotTokenCache.expiresAt - 60000) {
    return copilotTokenCache.token;
  }
  try {
    const response = await fetch("https://api.github.com/copilot_internal/v2/token", {
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot/1.300.0",
      },
    });
    if (!response.ok) return null;
    const data = await response.json() as { token?: string; expires_at?: number };
    if (data.token) {
      copilotTokenCache = {
        token: data.token,
        expiresAt: (data.expires_at || 0) * 1000,
      };
      return data.token;
    }
  } catch { /* exchange failed */ }
  return null;
}

export async function getCopilotToken(): Promise<string | null> {
  // First try: exchange stored OAuth token for Copilot token
  const auth = loadAuth();
  if (auth?.token) {
    const copilotToken = await exchangeCopilotToken(auth.token);
    if (copilotToken) return copilotToken;
  }
  // Second try: use gh CLI token directly (has Copilot access built-in)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process");
    const ghToken = execSync("gh auth token", { encoding: "utf-8", env: shellEnv }).trim();
    if (ghToken) {
      // Try exchanging gh CLI token too
      const copilotToken = await exchangeCopilotToken(ghToken);
      if (copilotToken) return copilotToken;
      // gh CLI token might work directly
      return ghToken;
    }
  } catch { /* gh not available */ }
  return null;
}

export { GITHUB_CLIENT_ID, shellEnv };
