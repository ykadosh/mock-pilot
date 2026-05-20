import { SectionCard } from "../../components/ui/SectionCard";

interface ProjectNameSectionProps {
  name: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProjectNameSection({ name, onChange, onSubmit }: ProjectNameSectionProps) {
  return (
    <SectionCard title="PROJECT NAME" className="col-span-12">
      <input
        type="text"
        value={name}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit();
        }}
        className="bg-surface-container-lowest focus:border-primary-container focus:ring-primary-container text-on-surface font-body-main px-md py-md w-full border border-[#334155] transition-all outline-none focus:ring-1"
      />
      <p className="mt-sm text-ui-small text-outline">The display name for this project.</p>
    </SectionCard>
  );
}
