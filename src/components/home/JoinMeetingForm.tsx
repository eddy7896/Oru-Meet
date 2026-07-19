"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import {
  normaliseMeetingCode,
  isValidMeetingCode,
} from "@/lib/utils/meeting-code";

export default function JoinMeetingForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    // Auto-format: insert hyphens as user types (xxx-xxxx-xxx)
    const raw = e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase();
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
    }
    setCode(formatted);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalised = normaliseMeetingCode(code);

    if (!isValidMeetingCode(normalised)) {
      setError("Please enter a valid meeting code (e.g. abc-defg-hij)");
      return;
    }

    setError(null);
    startTransition(() => {
      router.push(`/lobby/${normalised}?role=participant`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
      <div className="space-y-1.5">
        <div className="relative">
          <input
            id="join-code-input"
            type="text"
            value={code}
            onChange={handleInput}
            placeholder="Enter a code (abc-defg-hij)"
            maxLength={12}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Meeting code"
            aria-describedby={error ? "code-error" : undefined}
            aria-invalid={!!error}
            className={`w-full rounded-xl border px-4 py-3.5 text-sm font-mono tracking-widest text-[#111827] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
              error
                ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
            }`}
          />
        </div>

        {error && (
          <div
            id="code-error"
            role="alert"
            className="flex items-center gap-1.5 text-xs text-[#DC2626]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <button
        id="join-meeting-btn"
        type="submit"
        disabled={isPending || code.length < 10}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-5 py-3.5 text-sm font-semibold text-[#111827] shadow-xs transition-all duration-150 hover:bg-[#F9FAFB] hover:border-[#D1D5DB] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Join meeting with entered code"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {isPending ? "Joining…" : "Join Meeting"}
      </button>
    </form>
  );
}
