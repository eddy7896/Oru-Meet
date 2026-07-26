"use client";

import { CloseCircle } from "iconsax-react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsStore } from "@/hooks/useYjsStore";
import { Loader2 } from "lucide-react";

interface WhiteboardPanelProps {
  roomId: string;
  onClose: () => void;
}

export default function WhiteboardPanel({ roomId, onClose }: WhiteboardPanelProps) {
  const storeWithStatus = useYjsStore({ roomId });

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
            Collaborate in real-time.
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
        <div className="absolute inset-0 flex flex-col" style={{ zIndex: 0 }}>
          {storeWithStatus.status === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#FAFAFA]">
              <Loader2 className="h-6 w-6 animate-spin text-[#1A73E8]" />
              <p className="text-xs font-medium text-slate-500">Connecting to whiteboard...</p>
            </div>
          )}
          {storeWithStatus.status === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-red-500">
              Failed to connect to the shared whiteboard.
            </div>
          )}
          {storeWithStatus.status === "synced" && (
            <Tldraw autoFocus={false} store={storeWithStatus.store} />
          )}
        </div>
      </div>
    </aside>
  );
}
