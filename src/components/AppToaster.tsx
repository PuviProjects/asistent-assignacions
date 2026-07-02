import { Toaster } from "sileo";
import { useTheme } from "@/components/theme/theme-context";
import { TOAST_POSITION } from "@/lib/toast";

/** Sileo toaster wired to the app's theme. */
export function AppToaster() {
  const { theme } = useTheme();
  return <Toaster position={TOAST_POSITION} theme={theme} />;
}
