"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Users } from "lucide-react";
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
      className="flex w-full md:w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#111827]"
      aria-label="Breakout Rooms panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Breakout Rooms</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Create Room */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Create a new room</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#1A73E8]"
            />
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !newRoomName.trim()}
              className="flex items-center justify-center rounded-lg bg-[#1A73E8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1557B0] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Assignments */}
        {breakoutRooms.length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/70">Assign Participants</label>
            <div className="space-y-2">
              {participants.filter(p => p.role !== 'host').map((p) => {
                const assignedBrId = assignments.find((a) => a.user_id === p.user_id)?.breakout_room_id || "";
                return (
                  <div key={p.id} className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-3">
                    <span className="text-sm text-white">{p.profiles?.full_name || "Unknown"}</span>
                    <select
                      value={assignedBrId}
                      onChange={(e) => handleAssign(p.user_id, e.target.value || null)}
                      className="w-full rounded-md border border-white/20 bg-[#111827] px-2 py-1 text-xs text-white outline-none"
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
                <p className="text-xs text-white/40 italic">No participants to assign.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      {breakoutRooms.length > 0 && (
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleToggleBreakouts}
            disabled={isStarting}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isBreakoutsActive ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#1A73E8] hover:bg-[#1557B0]"
            }`}
          >
            {isBreakoutsActive ? "Close All Breakout Rooms" : "Start Breakout Rooms"}
          </button>
        </div>
      )}
    </aside>
  );
}
