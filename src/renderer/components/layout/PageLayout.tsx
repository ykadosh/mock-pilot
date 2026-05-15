import { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, headerActions, children }: PageLayoutProps) {
  return (
    <main className="flex-1 min-w-0 bg-background overflow-y-auto p-lg">
      <header className="mb-lg max-w-5xl mx-auto">
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
          {headerActions && <div className="flex gap-md">{headerActions}</div>}
        </div>
      </header>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </main>
  );
}
