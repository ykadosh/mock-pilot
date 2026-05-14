import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Editor } from "@/pages/Editor";
import { Assets } from "@/pages/Assets";
import { Settings } from "@/pages/Settings";
import { AppSettings } from "@/pages/AppSettings";
import { Export } from "@/pages/Export";
import { CaptureBrowser } from "@/pages/CaptureBrowser";
import { AuthProvider } from "@/hooks/useAuth";

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/capture" element={<CaptureBrowser />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:projectId" element={<Editor />} />
            <Route path="/code-editor/:projectId" element={<Editor codeEditorDefault />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/settings/:projectId" element={<Settings />} />
            <Route path="/export/:projectId" element={<Export />} />
            <Route path="/app-settings" element={<AppSettings />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
