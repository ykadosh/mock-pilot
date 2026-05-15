import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { PageLayout } from "../components/layout/PageLayout";

export function Assets() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav activeTab="assets" projectId={projectId} />
      <div className="flex flex-1 min-h-0">
        <PageLayout
          title="Assets"
          subtitle="Manage your project's design assets and resources."
        >
        </PageLayout>
      </div>
    </div>
  );
}
