export function CanvasPreview() {
  return (
    <div className="flex-1 p-xl overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex justify-center">
      <div className="w-full max-w-5xl bg-white shadow-2xl self-start overflow-hidden rounded-lg">
        {/* Website Preview */}
        <div className="relative group">
          {/* Hover Selection Overlay */}
          <div className="absolute inset-0 border-2 border-violet-500 pointer-events-none opacity-0 group-hover:opacity-100 flex items-start justify-start p-2">
            <span className="bg-violet-500 text-white text-[10px] px-1 font-mono">
              section.hero
            </span>
          </div>

          {/* Page Content */}
          <div className="p-16 text-slate-900 bg-slate-50">
            <nav className="flex justify-between items-center mb-16">
              <div className="font-bold text-xl tracking-tight">
                NEURON<span className="text-violet-600">.</span>
              </div>
              <div className="flex gap-md text-sm font-medium text-slate-500">
                <span>Product</span>
                <span>Features</span>
                <span>Pricing</span>
                <span className="text-slate-900">Sign In</span>
              </div>
            </nav>

            <div className="grid grid-cols-2 gap-xl items-center">
              <div>
                <h1 className="text-5xl font-extrabold leading-tight mb-md text-slate-900">
                  Precision design for modern{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                    architects
                  </span>
                </h1>
                <p className="text-lg text-slate-600 mb-lg">
                  A unified workspace for building complex visual identities and
                  digital products with technical rigor.
                </p>
                <div className="flex gap-md">
                  <button className="bg-slate-900 text-white px-lg py-sm font-semibold rounded hover:bg-slate-800 transition-colors">
                    Start Building
                  </button>
                  <button className="border border-slate-300 px-lg py-sm font-semibold rounded hover:bg-slate-100 transition-colors">
                    View Demo
                  </button>
                </div>
              </div>
              <div className="relative">
                <img
                  className="rounded-xl shadow-lg border border-slate-200"
                  alt="Technical interface preview"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV29dtAtQLB1qzZpVehSmtK3O0SYz163zhVI3cL8T6ta_D-iaH7jb9nNEKm9Xcw9fuie7jvU_umAZzHGVMjIKPeB-C4LwkOmpS2e41wlYQ5O1nMV2BxdwW9GreQsfgRduhvp3c1ImX6JxSnjjkBloh8z448bvw4kgZZqPQBD4XNCjALlHLFfpLNcbatxeNrrYHqDqL9WO71MPGCRk_wdaG2wzg8jIllQZvXIPVGHxsZeG_xzE4wjyalTstvW5z8cfne0EoA182TV0"
                />
                <div className="absolute -top-2 -right-2 bg-violet-500 text-white p-1 rounded-sm shadow-md">
                  <span className="material-symbols-outlined text-sm">
                    edit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Bento Grid */}
          <div className="p-16 pt-0 bg-slate-50 grid grid-cols-3 gap-md">
            <div className="col-span-2 bg-white p-md rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex gap-md items-center">
                <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    Optimized Performance
                  </h4>
                  <p className="text-sm text-slate-500">
                    Sub-millisecond latency for all interactions.
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300">
                chevron_right
              </span>
            </div>
            <div className="bg-indigo-600 p-md rounded-xl text-white">
              <span className="material-symbols-outlined mb-sm">security</span>
              <h4 className="font-bold">Encrypted End-to-End</h4>
              <p className="text-sm opacity-80">Safety first approach.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
