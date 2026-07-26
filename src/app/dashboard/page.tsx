import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Video, Calendar, Clock, Copy, Plus } from "lucide-react";
import CreateMeetingButton from "@/components/home/CreateMeetingButton";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "Dashboard | oru-meet",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  const supabase = await createAdminClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("host_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA] font-sans selection:bg-[#1A73E8]/20 selection:text-[#1A73E8]">
      {/* -- Header ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/[0.04] bg-white/70 px-6 py-4 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#2563EB] shadow-sm">
            <Video className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#0F172A]">
            oru-meet
          </span>
        </Link>
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

      {/* -- Main Layout ---------------------------------- */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-[#64748B]">
              Manage your upcoming meetings and past sessions.
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <CreateMeetingButton />
          </div>
        </div>

        <div className="rounded-3xl border border-black/[0.04] bg-white p-6 shadow-sm ring-1 ring-black/[0.02]">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-[#0F172A]">
            <Calendar className="h-5 w-5 text-[#64748B]" />
            Your Meetings
          </h2>

          {!rooms || rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
                <Video className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-[15px] font-medium text-[#0F172A]">
                No meetings yet
              </h3>
              <p className="mt-1 text-[13px] text-[#64748B]">
                Create a new meeting to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-all hover:border-[#1A73E8]/30 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                          room.status === "active"
                            ? "bg-green-50 text-green-700"
                            : room.status === "waiting"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {room.status}
                      </span>
                      <Link
                        href={`/room/${room.code}`}
                        className="text-[13px] font-medium text-[#1A73E8] hover:underline"
                      >
                        Join
                      </Link>
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0F172A] truncate">
                      {room.title || "Untitled Meeting"}
                    </h3>
                    <p className="mt-1 font-mono text-[13px] text-[#64748B]">
                      {room.code}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#F1F5F9] pt-4">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#94A3B8]">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(room.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
