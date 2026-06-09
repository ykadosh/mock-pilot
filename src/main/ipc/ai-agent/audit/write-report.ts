import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function tsForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function resolveReportsDir(): string {
  // Dev: write into the repo root (process.cwd() === repo root when running
  // `npm start`). Fallback: userData dir if cwd is not writable.
  const cwdDir = path.join(process.cwd(), "audit-reports");
  if (ensureDir(cwdDir)) return cwdDir;
  const userDir = path.join(app.getPath("userData"), "audit-reports");
  ensureDir(userDir);
  return userDir;
}

function printReportToStdout(report: string, filePath: string): void {
  const banner = "═".repeat(80);
  // eslint-disable-next-line no-console
  console.log(`\n${banner}\n[Audit] Report written to ${filePath}\n${banner}\n`);
  // eslint-disable-next-line no-console
  console.log(report);
  // eslint-disable-next-line no-console
  console.log(`\n${banner}\n[Audit] End of report\n${banner}\n`);
}

/**
 * Writes the auditor's markdown report to disk under audit-reports/ and prints
 * the full report to stdout so the dev sees it in their `npm start` terminal.
 * Returns the absolute file path so the caller can log it.
 */
export function writeAuditReport(report: string, sessionId: string | undefined): string {
  const dir = resolveReportsDir();
  const sidPart = sessionId ? `-${sessionId.slice(0, 8)}` : "";
  const filePath = path.join(dir, `${tsForFilename()}${sidPart}.md`);
  try {
    fs.writeFileSync(filePath, report, "utf-8");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Audit] Failed to write report:", err);
  }
  printReportToStdout(report, filePath);
  return filePath;
}
