"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    // 1. Fetch initial message history
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

    // 2. Subscribe to new messages
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Fetch the profile for the new message since Realtime payloads
          // don't include joined relations automatically
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          if (profile) {
            newMessage.profiles = profile;
          }

          setMessages((prev) => {
            // Deduplicate in case our own insert returned faster
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsSending(true);
      setError(null);

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, content: content.trim() }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const { message } = await response.json();
        
        // Optimistically add to list (Realtime will deduplicate)
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message as ChatMessage];
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error sending message");
      } finally {
        setIsSending(false);
      }
    },
    [roomId]
  );

  return { messages, isLoading, isSending, error, sendMessage };
}
