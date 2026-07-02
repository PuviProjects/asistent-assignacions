import type { ReactNode } from "react";
import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-100 bg-black/45 animate-overlay-in" />
        <RDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-100 -translate-x-1/2 -translate-y-1/2",
            "w-[min(560px,calc(100vw-32px))] max-h-[90vh] flex flex-col",
            "bg-surface border border-border rounded-xl shadow-[var(--shadow-lg)]",
            "animate-dialog-in outline-none",
            className,
          )}
        >
          <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
            <div className="min-w-0 flex-1">
              <RDialog.Title className="text-[17px] font-semibold leading-tight">
                {title}
              </RDialog.Title>
              {description && (
                <RDialog.Description className="text-[13px] text-text-muted mt-0.5">
                  {description}
                </RDialog.Description>
              )}
            </div>
            <RDialog.Close
              className="shrink-0 -mr-1 -mt-1 size-8 inline-flex items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Tancar"
            >
              <X className="size-4" aria-hidden />
            </RDialog.Close>
          </div>

          <div className="px-5 py-5 overflow-y-auto">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-border">
              {footer}
            </div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
