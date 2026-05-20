export type DevicePreset = "laptop" | "tablet" | "mobile";
export type DeployTarget = "codesandbox" | "stackblitz";

export interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number; icon: string; label: string }> = {
  laptop: { width: 1920, height: 1080, icon: "laptop", label: "Laptop" },
  tablet: { width: 768, height: 1024, icon: "tablet_android", label: "Tablet" },
  mobile: { width: 390, height: 844, icon: "smartphone", label: "Mobile" },
};

export function extractExportMetrics(html: string | null) {
  if (!html) return { cssSize: 0, htmlSize: 0, extractedCss: "" };

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let css = "";
  let match: RegExpExecArray | null;

  while ((match = styleRegex.exec(html)) !== null) {
    css += `${match[1].trim()}\n\n`;
  }

  return {
    cssSize: new Blob([css]).size,
    htmlSize: new Blob([html]).size,
    extractedCss: css.trim(),
  };
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function buildPreviewHtml(html: string | null, projectUrl?: string, assetsBasePath?: string | null) {
  if (!html) return "";

  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  cleaned = resolveProjectUrls(cleaned, projectUrl);
  return injectBaseTag(cleaned, assetsBasePath);
}

export function getDeployTargetLabel(target: DeployTarget) {
  return target === "codesandbox" ? "CodeSandbox" : "StackBlitz";
}

export function getDeployStatusMessage(deploying: DeployTarget | null, deployError: string | null, deployTarget: DeployTarget | null) {
  if (deploying) {
    return { tone: "default", message: `Deploying to ${getDeployTargetLabel(deploying)}…`, success: false };
  }

  if (deployError) {
    return { tone: "error", message: deployError, success: false };
  }

  if (deployTarget) {
    return { tone: "default", message: `Opened in ${getDeployTargetLabel(deployTarget)}`, success: true };
  }

  return { tone: "default", message: "Deploy to CodeSandbox or StackBlitz to publish", success: false };
}

function resolveProjectUrls(html: string, projectUrl?: string) {
  if (!projectUrl) return html;

  try {
    const origin = new URL(projectUrl).origin;
    return html
      .replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/\//gi, "$1https://")
      .replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/(?!\/)/gi, `$1${origin}/`)
      .replace(/(url\(\s*['"]?)\/\//gi, "$1https://")
      .replace(/(url\(\s*['"]?)\/(?!\/)/gi, `$1${origin}/`);
  } catch {
    return html;
  }
}

function injectBaseTag(html: string, assetsBasePath?: string | null) {
  if (!assetsBasePath) return html;
  const baseTag = `<base href="${assetsBasePath}">`;
  return html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
}
