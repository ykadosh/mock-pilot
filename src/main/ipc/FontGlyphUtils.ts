import * as fs from "fs";
import * as path from "path";

import * as opentype from "opentype.js";
import { decompress } from "wawoff2";

export interface FontGlyph {
  codepoint: string;
  name: string;
}

export interface IconFontResult {
  family: string;
  glyphs: FontGlyph[];
}

const ICON_FONT_PATTERNS = [/icons?/i, /chevron/i, /symbol/i, /glyph/i];
const NUMBERED_FAMILY = /\s\d{3}$/;

/**
 * Extracts icon font glyphs for a project by parsing the font files directly.
 */
export async function extractProjectIconFontGlyphs(projectDir: string): Promise<IconFontResult[]> {
  const assetsJsonPath = path.join(projectDir, "assets.json");
  if (!fs.existsSync(assetsJsonPath)) return [];

  const assets = JSON.parse(fs.readFileSync(assetsJsonPath, "utf-8")) as { fontFaceCss?: string };
  const fontFaceCss = assets.fontFaceCss || "";
  const blocks = fontFaceCss.match(/@font-face\s*\{[^}]*\}/gi) || [];

  const iconBlocks = blocks.filter((b) => isIconFontBlock(b));
  const fontsByFamily = groupBlocksByFamily(iconBlocks);

  const results: IconFontResult[] = [];
  for (const [family, block] of fontsByFamily) {
    const filePath = resolveFontFilePath(block, path.join(projectDir, "assets"));
    if (!filePath) continue;
    const glyphs = await extractGlyphsFromFont(filePath);
    results.push({ family, glyphs });
  }
  return results;
}

function isIconFontBlock(block: string): boolean {
  const fm = block.match(/font-family:\s*["']?([^;"'}]+)/i);
  if (!fm) return false;
  const family = fm[1].trim().replace(/["']/g, "");
  return !NUMBERED_FAMILY.test(family) && ICON_FONT_PATTERNS.some((p) => p.test(family));
}

function groupBlocksByFamily(blocks: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of blocks) {
    const fm = block.match(/font-family:\s*["']?([^;"'}]+)/i);
    if (!fm) continue;
    const family = fm[1].trim().replace(/["']/g, "");
    if (!map.has(family)) map.set(family, block);
  }
  return map;
}

/**
 * Extracts all glyphs with unicode codepoints from a font file.
 * Supports woff2, woff, ttf, and otf formats.
 */
export async function extractGlyphsFromFont(fontFilePath: string): Promise<FontGlyph[]> {
  const ext = path.extname(fontFilePath).toLowerCase();
  const buffer = fs.readFileSync(fontFilePath);

  let arrayBuffer: ArrayBuffer;
  if (ext === ".woff2") {
    const decompressed = await decompress(buffer);
    arrayBuffer = decompressed.buffer.slice(
      decompressed.byteOffset,
      decompressed.byteOffset + decompressed.byteLength,
    );
  } else {
    arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  const font = opentype.parse(arrayBuffer);
  const glyphs: FontGlyph[] = [];

  for (let i = 0; i < font.numGlyphs; i++) {
    const g = font.glyphs.get(i);
    if (g.unicode !== undefined && g.unicode > 32) {
      glyphs.push({
        codepoint: g.unicode.toString(16).padStart(4, "0"),
        name: g.name || "",
      });
    }
  }

  return glyphs;
}

/**
 * Resolves the best available font file path for a given @font-face block.
 * Prefers woff2 > woff > ttf/font-sfnt > otf.
 */
export function resolveFontFilePath(fontFaceBlock: string, assetsBasePath: string): string | null {
  const formats = [".woff2", ".woff", ".font-sfnt", ".ttf", ".otf"];

  for (const ext of formats) {
    const pattern = new RegExp(`url\\("(assets/[^"]+${ext.replace(".", "\\.")})"\\)`, "i");
    const match = fontFaceBlock.match(pattern);
    if (match) {
      const filePath = path.join(assetsBasePath, "..", match[1]);
      if (fs.existsSync(filePath)) return filePath;
    }
  }

  return null;
}
