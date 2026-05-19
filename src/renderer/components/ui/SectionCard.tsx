import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "danger";
}

export function SectionCard({ title, children, className = "", variant = "default" }: SectionCardProps) {
  if (variant === "danger") {
    return (
      <section className={`bg-surface-container border-error-container p-md border ${className}`}>
        {title && (
          <h2 className="font-label-caps text-label-caps text-error mb-md gap-xs flex items-center">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            {title}
          </h2>
        )}
        {children}
      </section>
    );
  }

  return (
    <section className={`bg-surface-container p-md border border-[#334155] ${className}`}>
      {title && <h2 className="font-label-caps text-label-caps text-secondary mb-md">{title}</h2>}
      {children}
    </section>
  );
}
