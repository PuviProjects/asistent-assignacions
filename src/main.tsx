import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "sileo/styles.css";
import "slot-text/style.css";
import "./index.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppToaster } from "@/components/AppToaster";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
      <AppToaster />
    </ThemeProvider>
  </StrictMode>,
);
