"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2, AlertCircle } from "lucide-react";
import { generateMeetingCode } from "@/lib/utils/meeting-code";

export default function CreateMeetingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = isPending || isCreating;

  async function handleCreate() {
    setIsCreating(true);
    setError(null);

    try {
      const code = generateMeetingCode();

      // Create the room record in Supabase before navigating to the lobby
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create room");
      }

      // Navigate to lobby as host
      startTransition(() => {
        router.push(`/lobby/${code}?role=host`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        id="create-meeting-btn"
        onClick={handleCreate}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#1A73E8] to-[#2563EB] px-6 py-4 text-[15px] font-semibold text-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:shadow-soft"
        aria-label="Start a new meeting"
      >
        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {loading ? (
          <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
        ) : (
          <Video className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        )}
        <span className="relative z-10">
          {loading ? "Creating room…" : "Start a Meeting"}
        </span>
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[#DC2626]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
