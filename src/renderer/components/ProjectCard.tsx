import { useNavigate } from "react-router-dom";

interface ProjectCardProps {
  title: string;
  url: string;
  imageUrl: string;
  lastEdit: string;
  isHero?: boolean;
  isActive?: boolean;
}

export function ProjectCard({
  title,
  url,
  imageUrl,
  lastEdit,
  isHero,
  isActive,
}: ProjectCardProps) {
  return (
    <div
      className={`group relative bg-surface-container border border-outline-variant/30 overflow-hidden hover:border-primary/50 transition-all flex flex-col ${
        isHero ? "col-span-1 lg:col-span-2 row-span-1" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-surface-container-lowest ${
          isHero ? "h-64" : "h-40"
        }`}
      >
        <img
          className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
          src={imageUrl}
          alt={title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
        {isActive && (
          <div className="absolute top-md right-md bg-primary-container/80 backdrop-blur-md px-sm py-xs text-[10px] font-bold text-on-primary-container uppercase tracking-widest rounded-sm border border-primary/20">
            Active Now
          </div>
        )}
      </div>

      <div className={`p-md ${isHero ? "flex flex-col justify-between flex-grow" : ""}`}>
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-ui-small text-on-surface-variant/60 font-code-block mt-xs">
            {url}
          </p>
        </div>
        <div
          className={`flex items-center ${
            isHero ? "justify-between" : ""
          } gap-sm mt-lg pt-md border-t border-outline-variant/20`}
        >
          <div className="flex items-center gap-sm">
            {isHero && <div className="w-2 h-2 rounded-full bg-secondary" />}
            {!isHero && (
              <span className="material-symbols-outlined text-sm text-on-tertiary">
                history
              </span>
            )}
            <span className="text-ui-small text-on-surface-variant">
              Last edit: {lastEdit}
            </span>
          </div>
          {isHero && (
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-white cursor-pointer">
                settings
              </span>
              <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-white cursor-pointer">
                open_in_new
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewProjectCard() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/editor")}
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
  );
}
