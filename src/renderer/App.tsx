import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Editor } from "@/pages/Editor";
import { Assets } from "@/pages/Assets";

function App() {
  return (
    <div className="dark">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="/assets" element={<Assets />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
