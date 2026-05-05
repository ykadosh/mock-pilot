import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Hello, MockPilot!</h1>
      <p className="text-muted-foreground">
        Electron + React + Vite + shadcn/ui
      </p>
      <Button>Get Started</Button>
    </div>
  );
}

export default App;
