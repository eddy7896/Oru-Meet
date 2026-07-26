"use client";

import { CloseCircle } from "iconsax-react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

interface WhiteboardPanelProps {
  onClose: () => void;
}

export default function WhiteboardPanel({ onClose }: WhiteboardPanelProps) {
  return (
    <aside
      className="flex h-full w-full flex-col bg-[#FAFAFA]"
      aria-label="Whiteboard panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Whiteboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Draw and share ideas visually.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 ml-4 shrink-0 transition-colors"
        >
          <CloseCircle size={24} variant="Linear" />
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
