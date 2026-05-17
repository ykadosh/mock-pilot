import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Dialog } from "./ui/Dialog";

interface ProjectCardProps {
  title: string;
  url: string;
  imageUrl?: string;
  lastEdit: string;
  isHero?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function ProjectCard({
  title,
  url,
  imageUrl,
  lastEdit,
  isHero,
  onClick,
  onDelete,
  onRename,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleScroll = () => setMenuOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 });
    }
    setMenuOpen((prev) => !prev);
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-surface-container border border-outline-variant/30 overflow-hidden hover:border-primary/50 transition-all flex flex-col cursor-pointer ${
        isHero ? "col-span-1 lg:col-span-2" : ""
      }`}
    >
      {/* Three-dots menu button — top right */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700/80 transition-colors text-slate-400 hover:text-slate-200 cursor-pointer opacity-0 group-hover:opacity-100"
      >
        <span className="material-symbols-outlined text-lg leading-none">more_vert</span>
      </button>

      {/* Menu portal */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onClick?.();
            }}
            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Open
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onRename?.();
            }}
            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onDelete?.();
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete
          </button>
        </div>,
        document.body
      )}

      <div className="relative overflow-hidden bg-surface-container-lowest h-40">
        {imageUrl ? (
          <img
            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
            src={imageUrl}
            alt={title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">language</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
      </div>

      <div className="p-md">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors truncate">
            {title}
          </h3>
          <p className="text-ui-small text-on-surface-variant/60 font-code-block mt-xs truncate">
            {url}
          </p>
        </div>
        <div className="flex items-center gap-sm mt-lg pt-md border-t border-outline-variant/20">
          <span className="material-symbols-outlined text-sm text-on-tertiary">
            history
          </span>
          <span className="text-ui-small text-on-surface-variant">
            Last edit: {lastEdit}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NewProjectCard() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await window.api.captureWebsite(url.trim());
      if (result.success && result.html) {
        let title: string;
        if (result.title && result.title.trim()) {
          title = result.title.trim();
        } else {
          try {
            title = new URL(url.trim()).hostname.replace(/^www\./, "");
          } catch {
            title = url.trim();
          }
        }
        const project = await window.api.saveProject({ url: url.trim(), title, html: result.html, thumbnail: result.thumbnail });
        const { setCapturedHtml } = await import("../lib/store");
        setCapturedHtml(result.html);
        setDialogOpen(false);
        navigate(`/editor/${project.id}`);
      } else {
        setError(result.error || "Failed to capture website");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setDialogOpen(true)}
        className="group border-2 border-dashed border-outline-variant/30 rounded flex flex-col items-center justify-center p-xl hover:border-primary/50 transition-all bg-surface-container/20 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full border border-outline-variant/50 flex items-center justify-center mb-md group-hover:scale-110 group-hover:bg-primary/10 transition-all">
          <span className="material-symbols-outlined text-primary">add</span>
        </div>
        <span className="font-headline-md text-on-surface-variant">
          Start a New Project
        </span>
        <p className="text-ui-small text-on-surface-variant/40 mt-xs text-center">
          Import from URL or use a pre-built template.
        </p>
      </div>

      <Dialog open={dialogOpen} onClose={() => !loading && setDialogOpen(false)}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
          New Project
        </h2>
        <p className="text-body-main text-on-surface-variant mb-lg">
          Paste the URL of the website you want to mock.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors mb-sm disabled:opacity-50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !loading) handleCreate();
          }}
        />
        {error && (
          <p className="text-ui-small text-error mb-sm">{error}</p>
        )}
        <div className="flex justify-end mt-md">
          <button
            onClick={handleCreate}
            disabled={!url.trim() || loading}
            className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-sm"
          >
            {loading && (
              <span className="material-symbols-outlined animate-spin text-sm">
                progress_activity
              </span>
            )}
            {loading ? "Capturing..." : "Create"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
