import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, headerActions, children }: PageLayoutProps) {
  return (
    <main className="bg-background p-lg min-w-0 flex-1 overflow-y-auto">
      <header className="mb-lg mx-auto max-w-5xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              {title}
            </h1>
            {subtitle && (
              <p className="text-ui-small text-outline">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && <div className="gap-md flex">{headerActions}</div>}
        </div>
      </header>
      <div className="mx-auto max-w-5xl">
        {children}
      </div>
    </main>
  );
}
