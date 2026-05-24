export interface AvailableFonts {
  /** Text font families with their available weights */
  textFonts: Map<string, string[]>;
  /** Icon font families with their available weights */
  iconFonts: Map<string, string[]>;
}

const ICON_FONT_PATTERNS = [/icons?/i, /chevron/i, /symbol/i, /glyph/i];
const NUMBERED_FAMILY_PATTERN = /\s\d{3}$/;

function isIconFont(family: string): boolean {
  return ICON_FONT_PATTERNS.some((pattern) => pattern.test(family));
}

/**
 * Parses @font-face CSS text and extracts available font families grouped by type.
 * Filters out "numbered" IE fallback families (e.g. "SF Pro Display 300").
 */
export function parseFontFaceCss(fontFaceCss: string | undefined | null): AvailableFonts {
  const textFonts = new Map<string, string[]>();
  const iconFonts = new Map<string, string[]>();

  if (!fontFaceCss) return { textFonts, iconFonts };

  const faceBlocks = fontFaceCss.match(/@font-face\s*\{[^}]*\}/gi) || [];

  for (const block of faceBlocks) {
    const parsed = parseSingleBlock(block);
    if (!parsed) continue;

    const target = isIconFont(parsed.family) ? iconFonts : textFonts;
    addWeight(target, parsed.family, parsed.weight);
  }

  sortWeights(textFonts);
  sortWeights(iconFonts);

  return { textFonts, iconFonts };
}

function parseSingleBlock(block: string): { family: string; weight: string } | null {
  const familyMatch = block.match(/font-family:\s*["']?([^;"'}]+)/i);
  if (!familyMatch) return null;

  const family = familyMatch[1].trim().replace(/["']/g, "");
  if (NUMBERED_FAMILY_PATTERN.test(family)) return null;

  const weightMatch = block.match(/font-weight:\s*(\d+|normal|bold)/i);
  const weight = weightMatch ? normalizeWeight(weightMatch[1]) : "400";

  return { family, weight };
}

function addWeight(map: Map<string, string[]>, family: string, weight: string): void {
  const existing = map.get(family) || [];
  if (!existing.includes(weight)) {
    existing.push(weight);
    map.set(family, existing);
  }
}

function sortWeights(map: Map<string, string[]>): void {
  for (const [family, weights] of map) {
    map.set(family, weights.sort((a, b) => Number(a) - Number(b)));
  }
}

function normalizeWeight(value: string): string {
  if (value === "normal") return "400";
  if (value === "bold") return "700";
  return value;
}

const WEIGHT_LABELS: Record<string, string> = {
  "100": "Thin",
  "200": "Extra Light",
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "Semi Bold",
  "700": "Bold",
  "800": "Extra Bold",
  "900": "Black",
};

export function getWeightLabel(weight: string): string {
  const label = WEIGHT_LABELS[weight];
  return label ? `${weight} (${label})` : weight;
}
