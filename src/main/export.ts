export function cleanHtmlForExport(html: string, baseUrl?: string): string {
  let cleaned = html;

  // Strip any <base> tags (injected for preview, not needed in export)
  cleaned = cleaned.replace(/<base\b[^>]*>/gi, "");

  // Strip all <script> tags — external scripts won't work offline
  cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  // Strip <noscript> wrappers
  cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Resolve relative URLs to absolute using the original page URL
  if (baseUrl) {
    try {
      const base = new URL(baseUrl);
      const origin = base.origin;
      // Convert protocol-relative URLs (//example.com/...) to absolute
      cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/\//gi, `$1https://`);
      // Convert root-relative URLs (/path/...) to absolute
      cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/(?!\/)/gi, `$1${origin}/`);
      // Convert relative URLs in CSS url() references
      cleaned = cleaned.replace(/(url\(\s*['"]?)\/\//gi, `$1https://`);
      cleaned = cleaned.replace(/(url\(\s*['"]?)\/(?!\/)/gi, `$1${origin}/`);
    } catch {
      // If baseUrl is invalid, skip URL resolution
    }
  }

  return cleaned;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
