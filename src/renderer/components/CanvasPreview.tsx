import { useEffect, useState } from "react";
import { getCapturedHtml } from "../lib/store";

export function CanvasPreview() {
  const [html, setHtml] = useState<string | null>(null);
  // When true, allows interaction with the iframe (for element picker)
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    setHtml(getCapturedHtml());
  }, []);

  return (
    <div className="flex-1 p-xl overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex justify-center">
      <div className="w-full max-w-5xl bg-white shadow-2xl self-start overflow-hidden rounded-lg relative">
        {html ? (
          <>
            <iframe
              srcDoc={html}
              className="w-full h-[800px] border-none"
              sandbox="allow-same-origin"
              title="Website Preview"
            />
            {/* Interaction blocker — removed when element picker is active */}
            {!interactive && (
              <div className="absolute inset-0 cursor-default" />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-md">
              web
            </span>
            <p className="text-sm">No website captured yet</p>
            <p className="text-xs text-slate-500 mt-xs">
              Create a new project to capture a website
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
