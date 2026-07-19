"use client";

import { X } from "lucide-react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

interface WhiteboardPanelProps {
  onClose: () => void;
}

/**
 * WhiteboardPanel - Renders a tldraw instance.
 * For this sprint, it is a personal whiteboard. Real-time syncing (Yjs) can be 
 * added later if required by attaching a custom store.
 */
export default function WhiteboardPanel({ onClose }: WhiteboardPanelProps) {
  return (
    <aside
      className="flex w-full md:w-[400px] shrink-0 flex-col border-l border-white/10 bg-[#111827]"
      aria-label="Whiteboard panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Whiteboard</h2>
        <button
          onClick={onClose}
          aria-label="Close whiteboard"
          className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tldraw Canvas */}
      <div className="flex-1 relative">
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <Tldraw autoFocus={false} />
        </div>
      </div>
    </aside>
  );
}
