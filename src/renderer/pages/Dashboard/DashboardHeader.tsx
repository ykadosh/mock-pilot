interface DashboardHeaderProps {
  onCreateProject: () => void;
}

export function DashboardHeader({ onCreateProject }: DashboardHeaderProps) {
  return (
    <section className="mb-xl flex items-end justify-between">
      <div className="space-y-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Recent Projects</h1>
        <p className="font-body-main text-on-surface-variant opacity-70">
          Manage and iterate on your active workspace deployments.
        </p>
      </div>
      <button
        onClick={onCreateProject}
        className="bg-primary hover:bg-surface-tint text-on-primary-fixed gap-sm px-lg py-md font-ui-small shadow-primary/10 flex items-center rounded font-bold shadow-lg transition-all"
      >
        <span className="material-symbols-outlined">add_circle</span>
        New Project
      </button>
    </section>
  );
}
