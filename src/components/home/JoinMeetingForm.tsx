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
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <div className="relative group">
          <input
            id="join-code-input"
            type="text"
            value={code}
            onChange={handleInput}
            placeholder="Enter code (abc-defg-hij)"
            maxLength={12}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Meeting code"
            aria-describedby={error ? "code-error" : undefined}
            aria-invalid={!!error}
            className={`peer w-full rounded-2xl border px-5 py-4 text-[15px] font-mono tracking-wider text-[#111827] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#9CA3AF] bg-[#F9FAFB] outline-none transition-all duration-300 focus:bg-white focus:ring-4 focus:ring-[#1A73E8]/10 focus:border-[#1A73E8] hover:bg-white hover:border-[#D1D5DB] ${
              error
                ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                : "border-[#E5E7EB]"
            }`}
          />
          {/* Subtle inner shadow effect for the input */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-opacity duration-300 peer-focus:opacity-0" />
        </div>

        {error && (
          <div
            id="code-error"
            role="alert"
            className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-[#DC2626] animate-fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <button
        id="join-meeting-btn"
        type="submit"
        disabled={isPending || code.length < 10}
        className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white px-6 py-4 text-[15px] font-semibold text-[#111827] shadow-sm transition-all duration-300 hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0 disabled:hover:shadow-sm"
        aria-label="Join meeting with entered code"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
        ) : (
          <LogIn className="h-5 w-5 text-[#6B7280] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#111827]" />
        )}
        {isPending ? "Joining…" : "Join Meeting"}
      </button>
    </form>
  );
}
