import { useRef, type ComponentType, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarRange,
  Download,
  Moon,
  Settings,
  SlidersHorizontal,
  Sun,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/DropdownMenu";
import { useTheme } from "@/components/theme/theme-context";
import { cn } from "@/lib/utils";
import { useDb } from "@/store/db";
import type { Database } from "@/types";

export type View = "hermanos" | "disp" | "planner" | "config";

const TABS: { id: View; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "hermanos", label: "Germans", icon: Users },
  { id: "disp", label: "Disponibilitat", icon: CalendarCheck },
  { id: "planner", label: "Planificació", icon: CalendarRange },
];

interface AppShellProps {
  view: View;
  onViewChange: (v: View) => void;
  children: ReactNode;
}

export function AppShell({ view, onViewChange, children }: AppShellProps) {
  const exportDatabase = useDb((s) => s.exportDatabase);
  const importDatabase = useDb((s) => s.importDatabase);
  const { theme, toggle } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(exportDatabase(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "planificador-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const db = JSON.parse(String(reader.result)) as Database;
        if (!Array.isArray(db.people)) throw new Error("bad shape");
        importDatabase(db);
        toast.success("Importat correctament");
      } catch {
        toast.error("Fitxer no vàlid");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-5 h-14 bg-surface/85 backdrop-blur border-b border-border">
        <nav className="flex items-center gap-1 rounded-lg bg-surface-2/60 p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onViewChange(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 rounded-md text-[13px] font-medium transition-colors",
                  active
                    ? "bg-surface text-text shadow-[var(--shadow-sm)]"
                    : "text-text-muted hover:text-text",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <Dropdown>
          <DropdownTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Opcions"
              className={cn(view === "config" && "bg-surface-2 text-text")}
            >
              <Settings className="size-4" aria-hidden />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem
              icon={<SlidersHorizontal className="size-4" aria-hidden />}
              onSelect={() => onViewChange("config")}
            >
              Configuració
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              icon={<Download className="size-4" aria-hidden />}
              onSelect={handleExport}
            >
              Exportar dades
            </DropdownItem>
            <DropdownItem
              icon={<Upload className="size-4" aria-hidden />}
              onSelect={() => fileRef.current?.click()}
            >
              Importar dades
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              icon={
                theme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )
              }
              onSelect={toggle}
            >
              {theme === "dark" ? "Mode clar" : "Mode fosc"}
            </DropdownItem>
          </DropdownContent>
        </Dropdown>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </header>

      <main className="px-5 py-7">{children}</main>
    </div>
  );
}
