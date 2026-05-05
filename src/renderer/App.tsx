import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Editor } from "@/pages/Editor";

function App() {
  return (
    <div className="dark">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
