import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ProjectCardProps {
  title: string;
  url: string;
  imageUrl?: string;
  lastEdit: string;
  isHero?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onDuplicate?: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

function getMenuPosition(button: HTMLButtonElement): MenuPosition {
  const { bottom, right } = button.getBoundingClientRect();
  return { top: bottom + 4, left: right - 144 };
}

function MenuItem({ icon, label, tone = "text-slate-300", onClick }: { icon: string; label: string; tone?: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; }) {
  return <button onClick={onClick} className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs ${tone} hover:bg-slate-700`}><span className="material-symbols-outlined text-base">{icon}</span>{label}</button>;
}

function ProjectCardMenu({ menuOpen, menuPos, menuRef, onClose, onSettings, onDuplicate, onDelete }: { menuOpen: boolean; menuPos: MenuPosition; menuRef: React.RefObject<HTMLDivElement | null>; onClose: () => void; onSettings?: () => void; onDuplicate?: () => void; onDelete?: () => void; }) {
  const handleSelect = (action?: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClose();
    action?.();
  };
  if (!menuOpen) return null;
  return createPortal(<div ref={menuRef} className="fixed z-[9999] w-36 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl" style={menuPos}><MenuItem icon="settings" label="Settings" onClick={handleSelect(onSettings)} /><MenuItem icon="content_copy" label="Duplicate" onClick={handleSelect(onDuplicate)} /><MenuItem icon="delete" label="Delete" tone="text-red-400" onClick={handleSelect(onDelete)} /></div>, document.body);
}

function ProjectCardContent({ title, url, imageUrl, lastEdit }: Pick<ProjectCardProps, "title" | "url" | "imageUrl" | "lastEdit">) {
  return <><div className="bg-surface-container-lowest relative h-40 overflow-hidden">{imageUrl ? <img className="h-full w-full object-cover object-top opacity-50 transition-transform duration-500 group-hover:scale-105" src={imageUrl} alt={title} /> : <div className="flex h-full w-full items-center justify-center"><span className="material-symbols-outlined text-4xl text-slate-600">language</span></div>}<div className="from-surface-container absolute inset-0 bg-gradient-to-t via-transparent to-transparent" /></div><div className="p-md"><div><h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary truncate transition-colors">{title}</h3><p className="text-ui-small text-on-surface-variant/60 font-code-block mt-xs truncate">{url}</p></div><div className="gap-sm mt-lg pt-md border-outline-variant/20 flex items-center border-t"><span className="material-symbols-outlined text-on-tertiary text-sm">history</span><span className="text-ui-small text-on-surface-variant">Last edit: {lastEdit}</span></div></div></>;
}

function useProjectCardMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setMenuOpen(false);
    };
    const handleScroll = () => setMenuOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menuOpen]);
  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!menuOpen && buttonRef.current) setMenuPos(getMenuPosition(buttonRef.current));
    setMenuOpen((prev) => !prev);
  };
  return { menuOpen, menuPos, menuRef, buttonRef, closeMenu: () => setMenuOpen(false), toggleMenu };
}

export function ProjectCard({ title, url, imageUrl, lastEdit, isHero, onClick, onDelete, onSettings, onDuplicate }: ProjectCardProps) {
  const { menuOpen, menuPos, menuRef, buttonRef, closeMenu, toggleMenu } = useProjectCardMenu();
  return <div onClick={onClick} className={`group bg-surface-container border-outline-variant/30 hover:border-primary/50 relative flex cursor-pointer flex-col overflow-hidden border transition-all ${isHero ? "col-span-1 lg:col-span-2" : ""}`}><button ref={buttonRef} onClick={toggleMenu} className="absolute top-2 right-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-slate-700/80 hover:text-slate-200"><span className="material-symbols-outlined text-lg leading-none">more_vert</span></button><ProjectCardMenu menuOpen={menuOpen} menuPos={menuPos} menuRef={menuRef} onClose={closeMenu} onSettings={onSettings} onDuplicate={onDuplicate} onDelete={onDelete} /><ProjectCardContent title={title} url={url} imageUrl={imageUrl} lastEdit={lastEdit} /></div>;
}

export { NewProjectCard } from "./NewProjectCard";
