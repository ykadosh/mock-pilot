export function PropertiesPanel() {
  return (
    <aside className="absolute right-4 top-14 bottom-4 w-72 bg-slate-900/90 backdrop-blur-md border border-[#334155] rounded-lg flex flex-col overflow-hidden shadow-2xl">
      <div className="p-sm border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <span className="font-label-caps text-label-caps text-slate-300">
          ELEMENT PROPERTIES
        </span>
        <span className="material-symbols-outlined text-sm text-slate-500">
          more_vert
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI Modifier */}
        <div className="p-md border-b border-slate-800">
          <h3 className="font-label-caps text-label-caps text-slate-500 mb-sm">
            AI MODIFIER
          </h3>
          <textarea
            className="w-full bg-[#020617] border border-[#334155] rounded p-sm text-ui-small font-body-main text-on-surface focus:outline-none focus:border-primary-container h-24 resize-none placeholder-slate-600 mb-sm"
            placeholder="Describe changes to the selected element..."
          />
          <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-ui-small text-ui-small py-1.5 rounded transition-colors flex items-center justify-center gap-xs">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Apply Modification
          </button>
        </div>

        {/* Layout */}
        <div className="p-md border-b border-slate-800">
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-caps text-label-caps text-slate-500">
              LAYOUT
            </span>
            <span className="material-symbols-outlined text-xs text-slate-600">
              expand_less
            </span>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Width
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                defaultValue="100%"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Height
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                defaultValue="Auto"
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-md border-b border-slate-800">
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-caps text-label-caps text-slate-500">
              APPEARANCE
            </span>
            <span className="material-symbols-outlined text-xs text-slate-600">
              expand_less
            </span>
          </div>
          <div className="space-y-md">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Fill Color</span>
              <div className="flex items-center gap-sm">
                <span className="text-[10px] font-mono text-slate-500">
                  #F8FAFC
                </span>
                <div className="w-4 h-4 rounded-sm border border-slate-600 bg-slate-50" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Border Radius</span>
              <div className="flex items-center gap-sm bg-[#020617] border border-[#334155] rounded px-1">
                <input
                  className="w-8 bg-transparent border-none p-1 text-xs font-mono text-slate-300"
                  type="number"
                  defaultValue={12}
                />
                <span className="text-[10px] text-slate-600 px-1">px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Effects */}
        <div className="p-md">
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-caps text-label-caps text-slate-500">
              EFFECTS
            </span>
            <span className="material-symbols-outlined text-xs text-slate-400">
              add
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 p-sm rounded border border-dashed border-slate-700">
            <span className="text-[10px] text-slate-500">
              No effects applied
            </span>
          </div>
        </div>
      </div>

      {/* Active AI Suggestion */}
      <div className="p-md bg-violet-900/20 border-t border-violet-500/30">
        <div className="flex items-center gap-sm text-violet-400 mb-1">
          <span className="material-symbols-outlined text-sm">bolt</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Active AI Suggestion
          </span>
        </div>
        <p className="text-[11px] text-violet-300/80 leading-relaxed italic">
          "Try applying a glassmorphism effect to the header to match the modern
          aesthetic."
        </p>
      </div>
    </aside>
  );
}
