import React from "react";
import { X } from "lucide-react";

interface PanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: "normal" | "wide"; // e.g. normal for chat, wide for whiteboard
}

export function Panel({ title, onClose, children, width = "normal" }: PanelProps) {
  return (
    <aside
      className={`flex w-full ${
        width === "wide" ? "md:w-[400px]" : "md:w-[320px]"
      } shrink-0 flex-col bg-surface border-l border-border`}
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
