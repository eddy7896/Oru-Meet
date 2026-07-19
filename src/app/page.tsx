import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Video, BookOpen } from "lucide-react";
import CreateMeetingButton from "@/components/home/CreateMeetingButton";
import JoinMeetingForm from "@/components/home/JoinMeetingForm";

export default async function HomePage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* -- Header ---------------------------------------------------- */}
      <header className="flex items-center justify-between border-b border-[#F3F4F6] px-8 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A73E8]">
            <Video className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#111827]">
            oru-meet
          </span>
        </div>
        <UserButton />
      </header>

      {/* -- Hero ------------------------------------------------------ */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-10">
          {/* Greeting */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8F0FE] bg-[#E8F0FE] px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span className="text-xs font-medium text-[#1A73E8]">
                Virtual Classroom
              </span>
            </div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[#111827]">
              Hello, {firstName} 👋
            </h1>
            <p className="text-sm text-[#6B7280]">
              Start a new class or join an existing one with a meeting code.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <CreateMeetingButton />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#F3F4F6]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#9CA3AF]">or</span>
              </div>
            </div>

            <JoinMeetingForm />
          </div>
        </div>
      </main>

      {/* -- Footer ---------------------------------------------------- */}
      <footer className="border-t border-[#F3F4F6] px-8 py-4 text-center">
        <p className="text-xs text-[#9CA3AF]">
          oru-meet &mdash; Built for educators
        </p>
      </footer>
    </div>
  );
}
