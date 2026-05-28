interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

export interface ColorGroup {
  representative: ColorAsset;
  members: ColorAsset[];
}

// Default perceptual distance threshold (CIE76 deltaE in Lab space).
// ~2.3 is the just-noticeable difference; we use a larger value so that
// near-duplicate shades/tints of the same hue cluster into a single group.
const DEFAULT_DELTA_E_THRESHOLD = 16;

function parseColor(value: string): [number, number, number] | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith("#")) {
    let hex = v.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6 || /[^0-9a-f]/.test(hex)) return null;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  return null;
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  // sRGB D65 -> XYZ
  let x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  let y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) / 1.0;
  let z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function deltaE([l1, a1, b1]: [number, number, number], [l2, a2, b2]: [number, number, number]): number {
  const dl = l1 - l2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Greedily cluster colors by perceptual similarity (CIE76 deltaE in Lab).
 * Colors closer than `threshold` to an existing cluster's representative are
 * grouped into that cluster. The first color seen in a cluster becomes its
 * representative, preserving input ordering (which typically reflects
 * frequency / prominence).
 *
 * Colors with values that fail to parse are placed in singleton groups so
 * they are still surfaced in the palette.
 */
export function groupSimilarColors(
  colors: ColorAsset[],
  threshold: number = DEFAULT_DELTA_E_THRESHOLD,
): ColorGroup[] {
  const groups: { rep: ColorAsset; repLab: [number, number, number] | null; members: ColorAsset[] }[] = [];
  for (const color of colors) {
    const rgb = parseColor(color.value);
    const lab = rgb ? rgbToLab(rgb) : null;
    const match = lab ? groups.find((g) => g.repLab && deltaE(lab, g.repLab) <= threshold) : undefined;
    if (match) match.members.push(color);
    else groups.push({ rep: color, repLab: lab, members: [color] });
  }
  return groups.map((g) => ({ representative: g.rep, members: g.members }));
}
