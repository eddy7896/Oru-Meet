import Link from "next/link";
import { PhoneOff } from "lucide-react";

export default function EndedMeetingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111827] px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <PhoneOff className="h-8 w-8 text-white/80" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white tracking-tight">
          Meeting ended
        </h1>
        <p className="mb-8 text-[#9CA3AF]">
          The host has ended this meeting for everyone. Thanks for participating!
        </p>
        <Link
          href="/"
          className="rounded-xl bg-[#1A73E8] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1557B0] hover:shadow-md active:scale-95"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
