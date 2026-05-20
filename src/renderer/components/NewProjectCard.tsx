import { useNavigate } from "react-router-dom";

function NewProjectTrigger({ onClick }: { onClick: () => void }) {
  return <div onClick={onClick} className="group border-outline-variant/30 p-xl hover:border-primary/50 bg-surface-container/20 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed transition-all"><div className="border-outline-variant/50 mb-md group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full border transition-all group-hover:scale-110"><span className="material-symbols-outlined text-primary">add</span></div><span className="font-headline-md text-on-surface-variant">Start a New Project</span><p className="text-ui-small text-on-surface-variant/40 mt-xs text-center">Browse a website and capture the perfect state.</p></div>;
}

export function NewProjectCard() {
  const navigate = useNavigate();
  return <NewProjectTrigger onClick={() => navigate("/capture")} />;
}
