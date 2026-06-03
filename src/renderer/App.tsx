import { createHashRouter, RouterProvider } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Editor } from "@/pages/Editor";
import { Assets } from "@/pages/Assets";
import { Settings } from "@/pages/Settings";
import { AppSettings } from "@/pages/AppSettings";
import { Export } from "@/pages/Export";
import { CaptureBrowser } from "@/pages/CaptureBrowser";
import { AuthProvider } from "@/hooks/useAuth";
import { PromptAttachmentsProvider } from "@/hooks/usePromptAttachments";

const router = createHashRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/capture", element: <CaptureBrowser /> },
  { path: "/editor", element: <Editor /> },
  { path: "/editor/:projectId", element: <Editor /> },
  { path: "/code-editor/:projectId", element: <Editor codeEditorDefault /> },
  { path: "/assets", element: <Assets /> },
  { path: "/assets/:projectId", element: <Assets /> },
  { path: "/settings/:projectId", element: <Settings /> },
  { path: "/export/:projectId", element: <Export /> },
  { path: "/app-settings", element: <AppSettings /> },
]);

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <PromptAttachmentsProvider>
          <RouterProvider router={router} />
        </PromptAttachmentsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
