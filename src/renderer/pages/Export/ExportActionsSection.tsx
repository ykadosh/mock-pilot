import { SectionCard } from "../../components/ui/SectionCard";
import { ExportButton } from "./ExportButton";
import { getDeployStatusMessage, type DeployTarget } from "./Export.utils";

interface ExportActionsSectionProps {
  deployError: string | null;
  deploying: DeployTarget | null;
  deployTarget: DeployTarget | null;
  onDeployCodesandbox: () => void;
  onDeployStackblitz: () => void;
  onOpenInBrowser: () => void;
}

export function ExportActionsSection(props: ExportActionsSectionProps) {
  return (
    <>
      <OpenInBrowserCard onOpenInBrowser={props.onOpenInBrowser} />
      <DeploymentCard {...props} />
      <DeployStatusSection deployError={props.deployError} deploying={props.deploying} deployTarget={props.deployTarget} />
    </>
  );
}

function OpenInBrowserCard({ onOpenInBrowser }: Pick<ExportActionsSectionProps, "onOpenInBrowser">) {
  return (
    <SectionCard className="gap-md flex flex-col items-center justify-between md:flex-row lg:col-span-12">
      <ActionDescription icon="open_in_browser" title="OPEN IN BROWSER" description="Open the latest saved revision of this project directly in your default browser." />
      <div className="gap-sm flex shrink-0">
        <ExportButton onClick={onOpenInBrowser} icon="open_in_browser">Open in Browser</ExportButton>
      </div>
    </SectionCard>
  );
}

function DeploymentCard(props: ExportActionsSectionProps) {
  const { deploying, onDeployCodesandbox, onDeployStackblitz } = props;

  return (
    <SectionCard className="gap-md flex flex-col items-center justify-between md:flex-row lg:col-span-12">
      <ActionDescription icon="cloud_sync" title="DEPLOYMENT" description="Push your latest build directly to external platforms for collaborative editing or live staging." />
      <div className="gap-sm flex shrink-0">
        <DeployButton label="CodeSandbox" active={deploying === "codesandbox"} disabled={!!deploying} onClick={onDeployCodesandbox} />
        <DeployButton label="StackBlitz" active={deploying === "stackblitz"} disabled={!!deploying} onClick={onDeployStackblitz} />
      </div>
    </SectionCard>
  );
}

function ActionDescription({ description, icon, title }: { description: string; icon: string; title: string }) {
  return (
    <div className="gap-lg flex min-w-0 flex-1 items-center">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#334155]">
        <span className="material-symbols-outlined text-secondary text-2xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <h2 className="font-label-caps text-label-caps text-secondary">{title}</h2>
        <p className="text-ui-small text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

function DeployButton({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <ExportButton onClick={onClick} disabled={disabled} icon="rocket_launch">
      {active ? "Deploying…" : `Deploy to ${label}`}
    </ExportButton>
  );
}

function DeployStatusSection(props: Pick<ExportActionsSectionProps, "deployError" | "deploying" | "deployTarget">) {
  const status = getDeployStatusMessage(props.deploying, props.deployError, props.deployTarget);
  const borderClass = props.deployError ? "border-error/20" : "border-[#334155]";
  const textClass = props.deployError ? "text-error" : "text-outline";

  return (
    <section className={`bg-surface-container-low p-sm border lg:col-span-12 ${borderClass}`}>
      <div className="gap-md flex items-center">
        <span className={`font-mono text-[10px] tracking-widest uppercase ${textClass}`}>Deploy Status</span>
        <StatusMessage status={status} />
      </div>
    </section>
  );
}

function StatusMessage({ status }: { status: ReturnType<typeof getDeployStatusMessage> }) {
  if (status.success) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        <span className="text-on-surface font-mono text-[10px]">{status.message}</span>
      </div>
    );
  }

  return <span className="text-on-surface font-mono text-[10px]">{status.message}</span>;
}
