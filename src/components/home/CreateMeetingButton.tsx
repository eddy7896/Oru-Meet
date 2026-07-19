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
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1A73E8] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#1557B0] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Start a new meeting"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        {loading ? "Creating room…" : "Start a Meeting"}
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
