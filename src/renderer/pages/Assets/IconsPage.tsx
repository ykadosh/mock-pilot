import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { getLibraryById } from "../../lib/icon-libraries";
import type { IconLibraryMeta } from "../../lib/icon-libraries";
import { IconCell } from "./IconCell";
import { useIconAssets } from "./UseIconAssets.hooks";
import { useIconFonts } from "./UseIconFonts.hooks";
import { type IconFontGlyphData, useProjectIconFonts } from "./UseProjectIconFonts.hooks";
import { useProjectFonts } from "./UseProjectFonts.hooks";

export function IconsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { detectedLibraries, loading } = useIconAssets(projectId);
  const { iconFontsData, loading: iconFontsLoading } = useProjectIconFonts(projectId);
  useIconFonts(detectedLibraries);
  useProjectFonts(projectId);
  const [search, setSearch] = useState("");

  const libraries = useMemo(() => {
    return detectedLibraries
      .map((id) => getLibraryById(id))
      .filter((lib): lib is IconLibraryMeta => lib !== undefined);
  }, [detectedLibraries]);

  const isLoading = loading || iconFontsLoading;
  const hasContent = libraries.length > 0 || iconFontsData.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <IconsPageHeader />
      {isLoading && <p className="text-outline text-ui-small">Loading icons...</p>}
      {!isLoading && !hasContent && <EmptyIconsState />}
      {!isLoading && hasContent && (
        <IconsContent libraries={libraries} iconFontsData={iconFontsData} search={search} onSearch={setSearch} />
      )}
    </div>
  );
}

function IconsContent({ libraries, iconFontsData, search, onSearch }: { libraries: IconLibraryMeta[]; iconFontsData: IconFontGlyphData[]; search: string; onSearch: (v: string) => void }) {
  return (
    <>
      <IconSearchInput value={search} onChange={onSearch} />
      {libraries.map((lib) => (
        <IconLibrarySection key={lib.id} library={lib} search={search} />
      ))}
      {iconFontsData.map((font) => (
        <ProjectIconFontSection key={font.family} font={font} search={search} />
      ))}
    </>
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
          <IconCell key={icon.name} name={icon.name} codepoint={icon.codepoint} fontFamily={library.name} renderMode={library.renderMode} />
        ))}
      </div>
    </section>
  );
}

function ProjectIconFontSection({ font, search }: { font: IconFontGlyphData; search: string }) {
  const filteredGlyphs = useMemo(() => {
    if (!search.trim()) return font.glyphs;
    const query = search.toLowerCase().trim();
    return font.glyphs.filter((g) => g.name.toLowerCase().includes(query) || g.codepoint.includes(query));
  }, [font.glyphs, search]);

  if (filteredGlyphs.length === 0 && search.trim()) return null;

  return (
    <section className="mb-xl">
      <h2 className="text-on-surface font-headline-sm mb-sm text-lg font-semibold">
        {font.family}
        <span className="text-outline ml-2 text-sm font-normal">
          ({filteredGlyphs.length} icon{filteredGlyphs.length !== 1 ? "s" : ""})
        </span>
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-3">
        {filteredGlyphs.map((glyph) => (
          <IconCell key={glyph.codepoint} name={glyph.name || glyph.codepoint} codepoint={glyph.codepoint} fontFamily={font.family} />
        ))}
      </div>
    </section>
  );
}


