import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../../components/layout/PageLayout";
import { TopNav } from "../../components/layout/TopNav";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { ProjectSettingsContent } from "./ProjectSettingsContent";
import { SettingsHeaderActions } from "./SettingsHeaderActions";
import { useSettingsController } from "./Settings.hooks";

function SettingsPageBody({ settings }: { settings: ReturnType<typeof useSettingsController> }) {
  return (
    <>
      <ProjectSettingsContent
        createdDate={settings.createdDate}
        lastUpdated={settings.lastUpdated}
        name={settings.name}
        onCopyUrl={settings.handleCopyUrl}
        onDeleteRequest={() => settings.setShowDeleteDialog(true)}
        onNameChange={settings.setName}
        onRename={settings.handleRename}
        project={settings.project}
        storage={settings.storage}
        timeSinceUpdate={settings.timeSinceUpdate}
        urlCopied={settings.urlCopied}
      />
      <DeleteProjectDialog
        open={settings.showDeleteDialog}
        projectTitle={settings.project?.title}
        onClose={() => settings.setShowDeleteDialog(false)}
        onDelete={settings.handleDelete}
      />
    </>
  );
}

export function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const settings = useSettingsController(projectId, () => navigate("/"));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav activeTab="settings" projectId={projectId} />
      <div className="flex min-h-0 flex-1">
        <PageLayout
          title="General Settings"
          subtitle="Manage your project core configuration."
          headerActions={<SettingsHeaderActions hasChanges={settings.hasChanges} nameSaved={settings.nameSaved} onDiscard={settings.handleDiscard} onSave={settings.handleRename} />}
        >
          <SettingsPageBody settings={settings} />
        </PageLayout>
      </div>
    </div>
  );
}
