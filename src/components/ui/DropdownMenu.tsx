import type { ComponentProps, ReactNode } from "react";
import * as RDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export function Dropdown(props: ComponentProps<typeof RDropdown.Root>) {
  return <RDropdown.Root {...props} />;
}

export function DropdownTrigger(props: ComponentProps<typeof RDropdown.Trigger>) {
  return <RDropdown.Trigger {...props} />;
}

export function DropdownContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <RDropdown.Portal>
      <RDropdown.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-100 min-w-52 p-1 rounded-lg bg-surface border border-border shadow-[var(--shadow-lg)]",
          "origin-[var(--radix-dropdown-menu-content-transform-origin)] animate-overlay-in",
          className,
        )}
      >
        {children}
      </RDropdown.Content>
    </RDropdown.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  danger,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
}) {
  return (
    <RDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium",
        "cursor-pointer outline-none select-none transition-colors",
        danger
          ? "text-danger data-[highlighted]:bg-danger-soft"
          : "text-text data-[highlighted]:bg-surface-2",
      )}
    >
      {icon}
      {children}
    </RDropdown.Item>
  );
}

export function DropdownSeparator() {
  return <RDropdown.Separator className="my-1 h-px bg-border" />;
}
