import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { getLibraryById } from "../../lib/icon-libraries";
import type { IconLibraryMeta } from "../../lib/icon-libraries";
import { useIconAssets } from "./UseIconAssets.hooks";
import { useIconFonts } from "./UseIconFonts.hooks";

export function IconsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { detectedLibraries, loading } = useIconAssets(projectId);
  useIconFonts(detectedLibraries);
  const [search, setSearch] = useState("");

  const libraries = useMemo(() => {
    return detectedLibraries
      .map((id) => getLibraryById(id))
      .filter((lib): lib is IconLibraryMeta => lib !== undefined);
  }, [detectedLibraries]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <IconsPageHeader />
        <p className="text-outline text-ui-small">Loading icons...</p>
      </div>
    );
  }

  if (libraries.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <IconsPageHeader />
        <EmptyIconsState />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <IconsPageHeader />
      <IconSearchInput value={search} onChange={setSearch} />
      {libraries.map((lib) => (
        <IconLibrarySection key={lib.id} library={lib} search={search} />
      ))}
    </div>
  );
}

function IconsPageHeader() {
  return (
    <header className="mb-lg">
      <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Icons</h1>
      <p className="text-ui-small text-outline">Icon libraries detected in the captured website.</p>
    </header>
  );
}

function IconSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-md">
      <input
        type="text"
        placeholder="Search icons..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container text-on-surface border-outline-variant focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      />
    </div>
  );
}

function EmptyIconsState() {
  return (
    <p className="text-outline text-ui-small">
      No icon libraries detected. Capture a website that uses icon fonts to see them here.
    </p>
  );
}

function IconLibrarySection({ library, search }: { library: IconLibraryMeta; search: string }) {
  const filteredIcons = useMemo(() => {
    if (!search.trim()) return library.icons;
    const query = search.toLowerCase().trim();
    return library.icons.filter((icon) => icon.name.toLowerCase().includes(query));
  }, [library.icons, search]);

  if (filteredIcons.length === 0 && search.trim()) return null;

  return (
    <section className="mb-xl">
      <h2 className="text-on-surface font-headline-sm mb-sm text-lg font-semibold">
        {library.name}
        <span className="text-outline ml-2 text-sm font-normal">
          ({filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""})
        </span>
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-3">
        {filteredIcons.map((icon) => (
          <IconCell
            key={icon.name}
            name={icon.name}
            codepoint={icon.codepoint}
            renderMode={library.renderMode}
            fontFamily={library.name}
          />
        ))}
      </div>
    </section>
  );
}

function IconCell({ name, codepoint, renderMode, fontFamily }: { name: string; codepoint: string; renderMode: "codepoint" | "ligature"; fontFamily: string }) {
  const glyphContent = renderMode === "ligature"
    ? name
    : String.fromCodePoint(parseInt(codepoint, 16));

  // Map library display names to the actual CSS font-family values
  const fontFamilyMap: Record<string, string> = {
    "Font Awesome": "'Font Awesome 6 Free', 'Font Awesome 5 Free', 'FontAwesome'",
    "Material Icons": "'Material Icons', 'Material Symbols Outlined'",
    "Bootstrap Icons": "'bootstrap-icons'",
    "Remix Icons": "'remixicon'",
  };

  const cssFontFamily = fontFamilyMap[fontFamily] || fontFamily;

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

