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
 * useRoom — fetches room data and polls for updates every 3 seconds.
 */
export function useRoom(roomCode: string): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchRoom = async () => {
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .single();

      if (!isMounted) return;

      if (fetchError || !data) {
        setError("Room not found");
      } else {
        setRoom(data as Room);
      }
      setIsLoading(false);
    };

    // Initial fetch
    fetchRoom();

    // Poll for updates every 3 seconds instead of using Supabase Realtime
    const intervalId = setInterval(fetchRoom, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [roomCode]);

  return { room, isLoading, error };
}
