import { TopNav } from "../components/layout/TopNav";
import { AssetsIconNav } from "../components/layout/AssetsIconNav";

function SearchBar() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant px-2 py-1 flex items-center gap-2 rounded">
      <span className="material-symbols-outlined text-outline text-[16px]">
        search
      </span>
      <input
        className="bg-transparent border-none focus:ring-0 focus:outline-none text-ui-small w-48 text-on-surface"
        placeholder="Search Components..."
        type="text"
      />
    </div>
  );
}

function LibraryCard({
  name,
  description,
  tag,
  tagColor,
  icon,
  hoverBorder,
  buttonLabel,
  buttonPrimary,
}: {
  name: string;
  description: string;
  tag: string;
  tagColor?: string;
  icon: string;
  hoverBorder: string;
  buttonLabel: string;
  buttonPrimary?: boolean;
}) {
  return (
    <div
      className={`bg-surface-container border border-outline-variant p-md flex flex-col justify-between ${hoverBorder} transition-all cursor-default group`}
    >
      <div>
        <div className="flex justify-between items-start mb-sm">
          <span
            className={`${
              tagColor || "text-outline"
            } text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}
          >
            {tag}
          </span>
          <span className="material-symbols-outlined text-outline group-hover:text-primary">
            {icon}
          </span>
        </div>
        <h3 className="font-headline-md text-headline-md mb-xs">{name}</h3>
        <p className="text-ui-small text-on-surface-variant">{description}</p>
      </div>
      <button
        className={`mt-lg w-full py-2 text-ui-small font-bold rounded-sm active:scale-95 transition-transform ${
          buttonPrimary
            ? "bg-primary-container text-on-primary-container"
            : "border border-outline-variant text-on-surface hover:bg-surface-container-high"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function ComponentCard({
  name,
  category,
  status,
  children,
}: {
  name: string;
  category: string;
  status: "ready" | "optimizing";
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container border border-outline-variant group overflow-hidden">
      <div className="h-32 bg-[#020617] flex items-center justify-center p-md relative overflow-hidden">
        {children}
      </div>
      <div className="p-sm flex justify-between items-center border-t border-outline-variant">
        <div>
          <h4 className="text-ui-small font-bold">{name}</h4>
          <p className="text-[10px] text-on-surface-variant">{category}</p>
        </div>
        {status === "ready" ? (
          <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold">
            <span
              className="material-symbols-outlined text-[10px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            AI READY
          </span>
        ) : (
          <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[10px]">sync</span>
            OPTIMIZING
          </span>
        )}
      </div>
    </div>
  );
}

export function Assets() {
  return (
    <div className="overflow-hidden">
      <TopNav activeTab="assets">
        <SearchBar />
      </TopNav>
      <div className="flex pt-12 h-screen">
        <AssetsIconNav />

        <main className="ml-16 flex-1 grid grid-cols-12 h-full overflow-hidden">
          {/* Center: Component Bank */}
          <div className="col-span-9 bg-surface p-md overflow-y-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
            {/* Library Selection */}
            <section className="mb-xl">
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">
                Component Bank
              </h1>
              <p className="text-on-surface-variant text-body-main mb-lg">
                Define and generate optimized UI libraries for the neural design
                engine.
              </p>
              <div className="grid grid-cols-4 gap-md">
                <LibraryCard
                  name="shadcn/ui"
                  description="Headless components built on Radix UI and Tailwind CSS."
                  tag="Recommended"
                  tagColor="bg-primary/10 text-primary"
                  icon="terminal"
                  hoverBorder="hover:border-primary"
                  buttonLabel="Initialize"
                  buttonPrimary
                />
                <LibraryCard
                  name="Fluent UI"
                  description="Microsoft's technical design system for modern web apps."
                  tag="Enterprise"
                  icon="web"
                  hoverBorder="hover:border-secondary"
                  buttonLabel="Configure"
                />
                <LibraryCard
                  name="MUI"
                  description="Production-ready React components with Material Design."
                  tag="Material"
                  icon="palette"
                  hoverBorder="hover:border-tertiary"
                  buttonLabel="Configure"
                />
                <div className="bg-surface-container-low border border-dashed border-outline-variant p-md flex flex-col justify-center items-center text-center hover:border-primary transition-all cursor-default group">
                  <span className="material-symbols-outlined text-outline-variant text-[48px] mb-sm group-hover:text-primary">
                    add_circle
                  </span>
                  <h3 className="font-headline-md text-headline-md mb-xs">
                    Custom Library
                  </h3>
                  <p className="text-ui-small text-on-surface-variant">
                    Bridge your own proprietary CSS system.
                  </p>
                </div>
              </div>
            </section>

            {/* Component Grid */}
            <section>
              <div className="flex items-center justify-between mb-md border-b border-outline-variant pb-sm">
                <div className="flex items-center gap-lg">
                  <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
                    Available Components
                  </h2>
                  <div className="flex gap-md">
                    <button className="text-ui-small text-primary border-b border-primary px-1">
                      All
                    </button>
                    <button className="text-ui-small text-on-surface-variant hover:text-on-surface px-1">
                      Inputs
                    </button>
                    <button className="text-ui-small text-on-surface-variant hover:text-on-surface px-1">
                      Navigation
                    </button>
                    <button className="text-ui-small text-on-surface-variant hover:text-on-surface px-1">
                      Feedback
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="text-ui-small text-on-surface-variant">
                    154 Components
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    view_module
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-md">
                {/* Button */}
                <ComponentCard
                  name="Button"
                  category="Interactive / Actions"
                  status="ready"
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#7c3aed_1px,transparent_1px)] bg-[size:8px_8px]" />
                  <button className="px-4 py-2 bg-primary text-on-primary font-bold text-ui-small">
                    Click Me
                  </button>
                </ComponentCard>

                {/* Input */}
                <ComponentCard
                  name="Input"
                  category="Data / Forms"
                  status="ready"
                >
                  <div className="w-full h-10 border border-outline-variant bg-surface px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[16px]">
                      search
                    </span>
                    <div className="w-24 h-2 bg-outline-variant rounded-full" />
                  </div>
                </ComponentCard>

                {/* Modal */}
                <ComponentCard
                  name="Modal"
                  category="Overlays / Context"
                  status="optimizing"
                >
                  <div className="w-24 h-16 bg-surface-container-high border border-primary/50 shadow-[0_0_15px_rgba(124,58,237,0.1)] p-xs">
                    <div className="w-full h-2 bg-primary/20 mb-1" />
                    <div className="w-3/4 h-1 bg-outline-variant mb-1" />
                    <div className="w-1/2 h-1 bg-outline-variant" />
                  </div>
                </ComponentCard>

                {/* Accordion */}
                <ComponentCard
                  name="Accordion"
                  category="Layout / Disclosure"
                  status="ready"
                >
                  <div className="w-full flex flex-col gap-1">
                    <div className="w-full h-8 bg-surface border border-outline-variant flex items-center px-2 justify-between">
                      <div className="w-20 h-1 bg-outline-variant" />
                      <span className="material-symbols-outlined text-[12px]">
                        expand_more
                      </span>
                    </div>
                    <div className="w-full h-8 bg-surface border border-outline-variant flex items-center px-2 justify-between">
                      <div className="w-20 h-1 bg-outline-variant" />
                      <span className="material-symbols-outlined text-[12px]">
                        expand_more
                      </span>
                    </div>
                  </div>
                </ComponentCard>
              </div>
            </section>
          </div>

          {/* Right Sidebar: Active Libraries */}
          <aside className="col-span-3 bg-surface-container border-l border-outline-variant flex flex-col">
            <div className="p-md border-b border-outline-variant bg-surface-container-high">
              <h2 className="font-label-caps text-label-caps text-on-surface mb-xs uppercase">
                Active Libraries
              </h2>
              <p className="text-[10px] text-on-surface-variant">
                Libraries currently linked to the AI Generator.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-sm space-y-md">
              {/* Main Library */}
              <div className="bg-surface p-sm border-l-2 border-primary">
                <div className="flex justify-between items-start mb-xs">
                  <span className="text-ui-small font-bold">Main Project</span>
                  <button className="material-symbols-outlined text-outline text-[14px]">
                    more_vert
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-md">
                  <div className="w-6 h-6 bg-primary-container flex items-center justify-center rounded-sm">
                    <span className="material-symbols-outlined text-[14px] text-on-primary-container">
                      link
                    </span>
                  </div>
                  <span className="text-ui-small text-on-surface">
                    shadcn/ui{" "}
                    <span className="text-[10px] text-outline ml-1">
                      v2.4.1
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-on-surface-variant uppercase tracking-wider">
                      Sync Status
                    </span>
                    <span className="text-emerald-400 font-bold">
                      100% Synced
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1">
                    <div className="bg-emerald-500 w-full h-full" />
                  </div>
                </div>
              </div>

              {/* Secondary Library */}
              <div className="bg-surface-container-low p-sm border-l-2 border-outline-variant opacity-60">
                <div className="flex justify-between items-start mb-xs">
                  <span className="text-ui-small font-bold">
                    Secondary Workspace
                  </span>
                  <button className="material-symbols-outlined text-outline text-[14px]">
                    more_vert
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-md">
                  <div className="w-6 h-6 bg-surface-container-highest flex items-center justify-center rounded-sm">
                    <span className="material-symbols-outlined text-[14px] text-outline">
                      link_off
                    </span>
                  </div>
                  <span className="text-ui-small text-on-surface">
                    MUI Standard
                  </span>
                </div>
                <button className="w-full py-1.5 border border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
                  Activate Library
                </button>
              </div>
            </div>

            {/* Global Config */}
            <div className="p-md border-t border-outline-variant">
              <h3 className="font-label-caps text-label-caps text-on-surface mb-sm uppercase">
                Global Config
              </h3>
              <div className="space-y-md">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold">
                    Target Framework
                  </label>
                  <div className="bg-surface p-1 border border-outline-variant flex gap-1">
                    <button className="flex-1 py-1 bg-surface-container-high text-[10px] font-bold">
                      React
                    </button>
                    <button className="flex-1 py-1 text-[10px] text-on-surface-variant">
                      Vue
                    </button>
                    <button className="flex-1 py-1 text-[10px] text-on-surface-variant">
                      Svelte
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold">
                    Style Format
                  </label>
                  <div className="bg-surface px-2 py-1.5 border border-outline-variant flex items-center justify-between">
                    <span className="text-ui-small">Tailwind CSS</span>
                    <span className="material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-lg">
                  <div className="w-4 h-4 border border-primary bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-on-primary">
                      check
                    </span>
                  </div>
                  <span className="text-ui-small text-on-surface">
                    Auto-generate documentation
                  </span>
                </div>
              </div>
              <button className="w-full mt-xl py-3 bg-violet-600 text-white font-bold text-ui-small flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                RE-INDEX ALL
              </button>
            </div>
          </aside>
        </main>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-[0_8px_24px_rgba(124,58,237,0.4)] flex items-center justify-center group z-50">
        <span className="material-symbols-outlined text-[24px]">add</span>
        <span className="absolute right-14 bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-sm text-ui-small font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Generate Component
        </span>
      </button>
    </div>
  );
}
