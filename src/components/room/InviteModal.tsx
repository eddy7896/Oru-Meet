"use client";

import { useState } from "react";
import { X, Copy, Mail, Check, Link as LinkIcon } from "lucide-react";

interface InviteModalProps {
  roomCode: string;
  onClose: () => void;
}

export default function InviteModal({ roomCode, onClose }: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink = `${window.location.origin}/room/${roomCode}`;
  const emailSubject = encodeURIComponent("Join my oru-meet video call");
  const emailBody = encodeURIComponent(
    `You have been invited to an oru-meet video call.\n\nClick this link to join:\n${inviteLink}\n\nOr enter this meeting code on the home page: ${roomCode}`
  );
  const mailtoLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  async function handleCopy(text: string, type: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#374151] bg-[#1F2937] shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">Invite others</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <p className="text-sm text-text-secondary">
            Share this meeting link with others you want in the meeting.
          </p>

          <div className="space-y-4">
            {/* Invite Link */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Meeting Link
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-container p-2 pl-3">
                <LinkIcon className="h-4 w-4 shrink-0 text-text-secondary" />
                <span className="flex-1 truncate text-sm font-medium text-text-primary">
                  {inviteLink}
                </span>
                <button
                  onClick={() => handleCopy(inviteLink, "link")}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                    copiedLink
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#1A73E8] text-text-primary hover:bg-[#1557B0]"
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Meeting Code */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Meeting Code
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-container p-2 pl-3">
                <span className="flex-1 font-mono text-sm tracking-widest text-text-primary">
                  {roomCode}
                </span>
                <button
                  onClick={() => handleCopy(roomCode, "code")}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                    copiedCode
                      ? "bg-green-500/20 text-green-400"
                      : "bg-surface-container text-text-primary hover:bg-surface-container"
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="my-2 h-px w-full bg-surface-container" />

          {/* Email Share */}
          <a
            href={mailtoLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-container"
          >
            <Mail className="h-4 w-4" />
            Share via Email
          </a>
        </div>
      </div>
    </div>
  );
}
