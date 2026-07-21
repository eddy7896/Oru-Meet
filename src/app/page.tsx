import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { Video, BookOpen } from "lucide-react";
import CreateMeetingButton from "@/components/home/CreateMeetingButton";
import JoinMeetingForm from "@/components/home/JoinMeetingForm";

export default async function HomePage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA] font-sans selection:bg-[#1A73E8]/20 selection:text-[#1A73E8]">
      {/* -- Header ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/[0.04] bg-white/70 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#2563EB] shadow-sm">
            <Video className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#0F172A]">
            oru-meet
          </span>
        </div>
        <div className="flex items-center gap-4">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-2 ring-white shadow-sm",
              },
            }}
          />
        </div>
      </header>

      {/* -- Main Layout (Split Pane) ---------------------------------- */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        
        {/* Left Side: Content & Forms */}
        <div className="flex flex-1 flex-col justify-center px-6 py-16 lg:px-20 lg:py-0">
          <div className="w-full max-w-md animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
            
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1A73E8]/10 bg-[#1A73E8]/5 px-3.5 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A73E8] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A73E8]"></span>
              </span>
              <span className="text-[13px] font-semibold text-[#1A73E8]">
                Secure Virtual Classroom
              </span>
            </div>

            {/* Typography */}
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-[54px] lg:leading-[1.1]">
              Hello, {firstName}. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A73E8] to-[#2563EB]">
                Let&apos;s connect.
              </span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-[#64748B]">
              Premium video meetings for educators and students. Start a new class or join an existing one in seconds.
            </p>

            {/* Actions Panel */}
            <div className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-sm ring-1 ring-black/[0.02]">
              <div className="space-y-6">
                <CreateMeetingButton />
                
                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#F1F5F9]"></div>
                  <span className="mx-4 text-[13px] font-medium uppercase tracking-wider text-[#94A3B8]">or</span>
                  <div className="flex-grow border-t border-[#F1F5F9]"></div>
                </div>

                <JoinMeetingForm />
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Visual/Illustration (Hidden on mobile) */}
        <div className="relative hidden flex-1 items-center justify-center p-12 lg:flex">
          {/* Decorative background glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#1A73E8]/20 to-[#E8F0FE]/50 blur-[100px]" />
          
          <div className="relative w-full max-w-lg animate-float">
            {/* Abstract UI Representation */}
            <div className="aspect-[4/3] rounded-[2rem] border border-white/40 bg-white/20 p-4 shadow-2xl backdrop-blur-3xl ring-1 ring-black/5">
              <div className="h-full w-full rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] shadow-inner overflow-hidden flex flex-col">
                {/* Top bar fake UI */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#EAB308]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                  </div>
                  <div className="h-2 w-16 rounded-full bg-white/20" />
                </div>
                {/* Video Grid Fake UI */}
                <div className="flex-1 p-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 border border-white/5 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                     <div className="absolute bottom-2 left-2 h-2 w-12 rounded-full bg-white/60" />
                  </div>
                  <div className="rounded-xl bg-[#1A73E8]/20 border border-[#1A73E8]/30 relative overflow-hidden ring-2 ring-[#1A73E8] ring-offset-2 ring-offset-[#0F172A]">
                     <div className="absolute inset-0 bg-gradient-to-t from-[#1A73E8]/40 to-transparent" />
                     <div className="absolute bottom-2 left-2 h-2 w-16 rounded-full bg-white" />
                     <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#1A73E8] flex items-center justify-center shadow-sm">
                       <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                     </div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/5 relative overflow-hidden col-span-2">
                     <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                     <div className="absolute bottom-2 left-2 h-2 w-20 rounded-full bg-white/60" />
                  </div>
                </div>
                {/* Bottom Controls Fake UI */}
                <div className="h-14 border-t border-white/10 flex items-center justify-center gap-4 px-4 bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-white/20" />
                  <div className="h-8 w-8 rounded-full bg-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                  <div className="h-8 w-8 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* -- Footer ---------------------------------------------------- */}
      <footer className="border-t border-black/[0.04] bg-white px-8 py-6 text-center lg:py-5">
        <p className="text-[13px] font-medium text-[#94A3B8]">
          oru-meet &mdash; Designed for modern education
        </p>
      </footer>
    </div>
  );
}
