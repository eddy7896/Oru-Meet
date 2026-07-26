"use client";

import { useEffect, useState } from "react";
import { CloseCircle, AddCircle, Profile2User } from "iconsax-react";
import { createClient } from "@/lib/supabase/client";

interface BreakoutPanelProps {
  roomId: string; // The UUID
  roomCode: string; // The URL code
  onClose: () => void;
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface BreakoutRoom {
  id: string;
  name: string;
  livekit_room: string;
}

interface BreakoutAssignment {
  user_id: string;
  breakout_room_id: string;
}

export default function BreakoutPanel({ roomId, roomCode, onClose }: BreakoutPanelProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [assignments, setAssignments] = useState<BreakoutAssignment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isBreakoutsActive, setIsBreakoutsActive] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Fetch initial data
    async function load() {
      const [partsRes, roomsRes, assignRes, roomRes] = await Promise.all([
        supabase
          .from("participants")
          .select("id, user_id, role, profiles(full_name)")
          .eq("room_id", roomId)
          .eq("is_admitted", true),
        supabase.from("breakout_rooms").select("*").eq("room_id", roomId),
        supabase.from("breakout_assignments").select("*"),
        supabase.from("rooms").select("settings").eq("id", roomId).single(),
      ]);

      if (partsRes.data) setParticipants(partsRes.data as unknown as Participant[]);
      if (roomsRes.data) setBreakoutRooms(roomsRes.data as BreakoutRoom[]);
      
      // Filter assignments to only those in the current breakout rooms
      if (assignRes.data && roomsRes.data) {
        const brIds = new Set(roomsRes.data.map((r) => r.id));
        setAssignments(assignRes.data.filter((a) => brIds.has(a.breakout_room_id)) as BreakoutAssignment[]);
      }

      if (roomRes.data) {
        const settings = roomRes.data.settings as Record<string, unknown>;
        setIsBreakoutsActive(!!settings?.breakouts_active);
      }
    }
    load();
  }, [roomId, supabase]);

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/breakouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, name: newRoomName.trim() }),
      });
      if (res.ok) {
        const { breakoutRoom } = await res.json();
        setBreakoutRooms((prev) => [...prev, breakoutRoom]);
        setNewRoomName("");
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleAssign(userId: string, brId: string | null) {
    try {
      // Optimistic update
      setAssignments((prev) => {
        const filtered = prev.filter((a) => a.user_id !== userId);
        if (brId) {
          filtered.push({ user_id: userId, breakout_room_id: brId });
        }
        return filtered;
      });

      await fetch("/api/breakouts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, participantId: userId, breakoutRoomId: brId }),
      });
    } catch (err) {
      console.error("Failed to assign:", err);
    }
  }

  async function handleToggleBreakouts() {
    setIsStarting(true);
    const nextState = !isBreakoutsActive;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakouts_active: nextState }),
      });
      if (res.ok) {
        setIsBreakoutsActive(nextState);
      }
    } catch (err) {
      console.error("Failed to toggle breakouts:", err);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <aside
      className="flex h-full w-full flex-col bg-[#FAFAFA]"
      aria-label="Breakout Rooms panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Breakouts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Split participants into smaller rooms.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 ml-4 shrink-0 transition-colors"
        >
          <CloseCircle size={24} variant="Linear" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Create Room */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">Create a new room</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
            />
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !newRoomName.trim()}
              className="flex items-center justify-center rounded-xl bg-[#1A73E8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1557B0] disabled:opacity-50 transition-colors"
            >
              <AddCircle size={20} variant="Bold" />
            </button>
          </div>
        </div>

        {/* Assignments */}
        {breakoutRooms.length > 0 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Profile2User size={18} variant="Bold" color="#64748B" />
              Assign Participants
            </label>
            <div className="space-y-3">
              {participants.filter(p => p.role !== 'host').map((p) => {
                const assignedBrId = assignments.find((a) => a.user_id === p.user_id)?.breakout_room_id || "";
                return (
                  <div key={p.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-sm font-bold text-slate-900">{p.profiles?.full_name || "Unknown"}</span>
                    <select
                      value={assignedBrId}
                      onChange={(e) => handleAssign(p.user_id, e.target.value || null)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    >
                      <option value="">Main Room</option>
                      {breakoutRooms.map((br) => (
                        <option key={br.id} value={br.id}>
                          {br.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {participants.filter(p => p.role !== 'host').length === 0 && (
                <p className="text-sm font-medium text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                  No participants to assign.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      {breakoutRooms.length > 0 && (
        <div className="border-t border-slate-200 bg-white p-6">
          <button
            onClick={handleToggleBreakouts}
            disabled={isStarting}
            className={`w-full rounded-full px-4 py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-50 shadow-sm ${
              isBreakoutsActive ? "bg-red-500 hover:bg-red-600" : "bg-[#1A73E8] hover:bg-[#1557B0]"
            }`}
          >
            {isBreakoutsActive ? "Close All Breakout Rooms" : "Start Breakout Rooms"}
          </button>
        </div>
      )}
    </aside>
  );
}
