import { sileo, type SileoPosition } from "sileo";

/** Where toasts appear — must match the <Toaster> position in AppToaster. */
export const TOAST_POSITION: SileoPosition = "bottom-center";

/**
 * Thin adapter over `sileo` that keeps a `sonner`-like call signature
 * (`toast.success("message")`) so call sites stay simple. Position is pinned
 * to match the mounted Toaster's viewport.
 */
export const toast = {
  success: (title: string, description?: string) =>
    sileo.success({ title, description, position: TOAST_POSITION }),
  error: (title: string, description?: string) =>
    sileo.error({ title, description, position: TOAST_POSITION }),
  info: (title: string, description?: string) =>
    sileo.info({ title, description, position: TOAST_POSITION }),
  warning: (title: string, description?: string) =>
    sileo.warning({ title, description, position: TOAST_POSITION }),
};
