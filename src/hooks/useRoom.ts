"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

interface UseRoomReturn {
  room: Room | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useRoom — subscribes to a room record in Supabase Realtime.
 * Reactively reflects status changes (e.g., host ending the meeting).
 */
export function useRoom(roomCode: string): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from("rooms")
      .select("*")
      .eq("code", roomCode)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError("Room not found");
        } else {
          setRoom(data as Room);
        }
        setIsLoading(false);
      });

    // Subscribe to real-time updates on this room
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return { room, isLoading, error };
}
