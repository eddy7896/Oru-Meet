"use client";

import { useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useUser } from "@clerk/nextjs";
import { Send2, EmojiNormal, CloseCircle } from "iconsax-react";
import { cn } from "@/lib/utils/cn";

interface ChatPanelProps {
  roomId: string;
  onClose: () => void;
}

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
    <div className="flex h-full flex-col bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Messages</h2>
          <p className="text-xs text-slate-500 mt-1">
            You can chat here with other members during the meeting and they will be deleted after the meeting.
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4 shrink-0">
          <CloseCircle size={24} variant="Linear" />
        </button>
      </div>

      {/* Message list */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <p className="mt-8 text-center text-sm text-slate-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-500">
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
            // Fake an avatar based on name initial if not present
            const initial = senderName.charAt(0).toUpperCase();
            
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", isLocal ? "flex-row-reverse" : "flex-row")}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden shadow-sm">
                  {initial}
                </div>
                
                {/* Message Body */}
                <div className={cn("flex flex-col gap-1 max-w-[75%]", isLocal ? "items-end" : "items-start")}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-900">{isLocal ? "You" : senderName}</span>
                    <span className="text-xs text-slate-400">{timeStr}</span>
                  </div>
                  {isLocal ? (
                    <div className="rounded-2xl rounded-tr-sm bg-[#1A73E8] px-4 py-2.5 text-[13px] text-white shadow-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="text-[13px] text-slate-700 leading-relaxed pt-1">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-[#FAFAFA] px-2 py-1.5 shadow-sm focus-within:border-[#1A73E8] focus-within:ring-1 focus-within:ring-[#1A73E8] transition-all">
          <button className="p-2 text-yellow-500 hover:scale-110 transition-transform">
            <EmojiNormal size={20} variant="Bold" />
          </button>
          
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            rows={1}
            aria-label="Type a chat message"
            className="flex-1 resize-none bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 outline-none self-center pt-2"
            style={{ maxHeight: "80px", overflowY: "auto" }}
          />
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A73E8] text-white transition-all hover:bg-[#1557B0] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send2 size={16} variant="Bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
