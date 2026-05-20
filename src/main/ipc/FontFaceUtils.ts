export function extractFontFaceCss(html: string): string | null {
  const matches = html.match(/@font-face\s*\{[^}]*\}/gi);
  return matches && matches.length > 0 ? matches.join("\n") : null;
}
