"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(roomId: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const room = useRoomContext();

  // 1. Fetch initial message history
  useEffect(() => {
    supabase
      .from("messages")
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error("Failed to fetch messages:", fetchError.message, fetchError.details, fetchError.hint);
          setError(`Failed to load messages: ${fetchError.message}`);
        } else if (data) {
          setMessages(data as ChatMessage[]);
        }
        setIsLoading(false);
      });
  }, [roomId, supabase]);

  // 2. Listen to LiveKit Data Channel for real-time messages
  useEffect(() => {
    if (!room) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      if (topic === "chat_message") {
        try {
          const str = new TextDecoder().decode(payload);
          const newMessage = JSON.parse(str) as ChatMessage;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        } catch (err) {
          console.error("Failed to parse chat message payload", err);
        }
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsSending(true);
      setError(null);

      try {
        // Persist to DB first
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, content: content.trim() }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const { message } = await response.json();
        
        // Optimistically add to local list
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message as ChatMessage];
        });

        // Broadcast over LiveKit Data Channel to peers instantly
        if (room) {
          const payload = new TextEncoder().encode(JSON.stringify(message));
          await room.localParticipant.publishData(payload, {
            reliable: true,
            topic: "chat_message",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error sending message");
      } finally {
        setIsSending(false);
      }
    },
    [roomId, room]
  );

  return { messages, isLoading, isSending, error, sendMessage };
}
