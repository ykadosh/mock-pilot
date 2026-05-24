const FONT_FAMILY_MAP: Record<string, string> = {
  "Font Awesome": "'Font Awesome 6 Free', 'Font Awesome 5 Free', 'FontAwesome'",
  "Material Icons": "'Material Icons', 'Material Symbols Outlined'",
  "Bootstrap Icons": "'bootstrap-icons'",
  "Remix Icons": "'remixicon'",
};

interface IconCellProps {
  name: string;
  codepoint: string;
  fontFamily: string;
  renderMode?: "codepoint" | "ligature";
}

export function IconCell({ name, codepoint, fontFamily, renderMode = "codepoint" }: IconCellProps) {
  const glyphContent = renderMode === "ligature"
    ? name
    : String.fromCodePoint(parseInt(codepoint, 16));

  const cssFontFamily = FONT_FAMILY_MAP[fontFamily] || `"${fontFamily}"`;

  return (
    <div className="bg-surface-container hover:bg-surface-container-high flex flex-col items-center justify-center rounded-md p-2 transition-colors" title={name}>
      <span
        className="text-on-surface mb-1 text-2xl leading-none"
        style={{ fontFamily: cssFontFamily, fontWeight: 900 }}
      >
        {glyphContent}
      </span>
      <span className="text-outline w-full truncate text-center text-[10px]">
        {name}
      </span>
    </div>
  );
}
