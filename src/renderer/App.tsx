import { TopNav } from "@/components/layout/TopNav";
import { SideNav } from "@/components/layout/SideNav";
import { Dashboard } from "@/pages/Dashboard";

function App() {
  return (
    <div className="dark">
      <TopNav />
      <SideNav />
      <Dashboard />
    </div>
  );
}

export default App;
