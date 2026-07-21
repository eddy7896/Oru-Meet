import React from "react";
import { cn } from "@/lib/utils/cn";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
}

export function IconButton({
  active = false,
  danger = false,
  highlight = false,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={active ? activeLabel : inactiveLabel}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-95",
        
        // Google Meet style: Default is dark transparent
        !active && !danger && !highlight && "bg-surface-container text-text-primary hover:bg-border",
        
        // Active highlight (e.g., Hand raised, screen sharing)
        active && highlight && "bg-primary-light text-primary hover:bg-primary/20",
        
        // Danger state (e.g., Mic off, Cam off)
        danger && !active && "bg-danger text-white hover:bg-danger/90",
        
        className
      )}
      {...props}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}
