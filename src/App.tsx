import { useState } from "react";
import { AppShell, type View } from "@/components/layout/AppShell";
import { HermanosView } from "@/features/hermanos/HermanosView";
import { DisponibilitatView } from "@/features/disponibilitat/DisponibilitatView";
import { PlanificacioView } from "@/features/planificacio/PlanificacioView";
import { ConfiguracioView } from "@/features/configuracio/ConfiguracioView";

export default function App() {
  const [view, setView] = useState<View>("hermanos");

  return (
    <AppShell view={view} onViewChange={setView}>
      {view === "hermanos" && <HermanosView />}
      {view === "disp" && <DisponibilitatView />}
      {view === "planner" && <PlanificacioView />}
      {view === "config" && <ConfiguracioView />}
    </AppShell>
  );
}
