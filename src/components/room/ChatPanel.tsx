"use client";

import { useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useUser } from "@clerk/nextjs";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/Panel";

interface ChatPanelProps {
  roomId: string;
  onClose: () => void;
}

/**
 * ChatPanel — real-time in-call chat using LiveKit's data channel.
 * Messages are sent/received via LiveKit's useChat hook (no Supabase round-trip
 * needed for in-room chat during the session).
 */
export default function ChatPanel({ roomId, onClose }: ChatPanelProps) {
  const { user } = useUser();
  const { messages, sendMessage, isSending, isLoading } = useChat(roomId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    await sendMessage(text);
    // Scroll to bottom after sending
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Panel title="In-call messages" onClose={onClose}>
      <div className="flex h-full flex-col">
        {/* Message list */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <p className="mt-8 text-center text-xs text-text-secondary">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="mt-8 text-center text-xs text-text-secondary">
              No messages yet. Say something!
            </p>
          ) : (
            messages.map((msg) => {
              const isLocal = msg.sender_id === user?.id;
              const senderName = msg.profiles?.full_name || "Someone";
              const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col gap-0.5", isLocal && "items-end")}
                >
                  <span className="text-[10px] text-text-secondary">
                    {isLocal ? "You" : senderName} · {timeStr}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isLocal
                        ? "rounded-tr-sm bg-[#1A73E8] text-text-primary"
                        : "rounded-tl-sm bg-surface-container text-text-secondary"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-container px-3 py-2">
            <textarea
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message…"
              rows={1}
              aria-label="Type a chat message"
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-white/30 outline-none"
              style={{ maxHeight: "80px", overflowY: "auto" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A73E8] text-text-primary transition-all hover:bg-[#1557B0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-text-secondary">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </Panel>
  );
}
