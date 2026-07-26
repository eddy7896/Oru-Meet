"use client";

import {
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useDataChannel
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo, useState } from "react";
import { Hand } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // For the spotlight layout, pick the first track (or screen share if active) as the main view.
  const mainTrack = tracks.find((t) => t.source === Track.Source.ScreenShare) || tracks[0];
  
  // The rest of the tracks go into the bottom row.
  const otherTracks = useMemo(() => {
    if (!mainTrack) return [];
    return tracks.filter(
      (t) => t.participant.identity !== mainTrack.participant.identity || t.source !== mainTrack.source
    );
  }, [tracks, mainTrack]);

  // Hand Raise State
  const { localParticipant } = useLocalParticipant();
  const [isHandRaised, setIsHandRaised] = useState(false);

  useDataChannel("hand_raise", (msg) => {
    const data = JSON.parse(new TextDecoder().decode(msg.payload));
    if (data.type === "HAND_RAISE" && msg.from?.identity === localParticipant.identity) {
      setIsHandRaised(data.isRaised);
    }
  });

  async function toggleHand() {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    const payload = new TextEncoder().encode(JSON.stringify({ type: "HAND_RAISE", isRaised: newState }));
    await localParticipant.publishData(payload, { reliable: true, topic: "hand_raise" });
  }

  if (tracks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 rounded-3xl">
        <p className="text-slate-500 font-medium">Waiting for others to join...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-2 md:gap-4">
      {/* Main Spotlight Video */}
      {mainTrack && (
        <div className="flex-1 w-full bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-sm">
          <ParticipantTile 
            trackRef={mainTrack} 
            className="w-full h-full object-cover" 
          />
          {/* Floating Hand Raise Button */}
          <button
            onClick={toggleHand}
            className={cn(
              "absolute bottom-4 right-4 md:bottom-6 md:right-6 flex h-14 w-14 items-center justify-center rounded-[1.25rem] md:rounded-2xl shadow-lg transition-all z-20",
              isHandRaised ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            )}
            aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
          >
            <Hand size={24} className={isHandRaised ? "fill-current" : ""} />
          </button>
        </div>
      )}

      {/* Bottom Row Videos */}
      {otherTracks.length > 0 && (
        <div className="flex gap-2 md:gap-4 h-32 md:h-48 shrink-0 overflow-x-auto pb-1 md:pb-2 scrollbar-hide">
          {otherTracks.map((trackRef, idx) => (
            <div 
              key={`${trackRef.participant.identity}-${trackRef.source}-${idx}`}
              className="h-full aspect-square md:aspect-[4/3] bg-slate-100 rounded-[1.25rem] md:rounded-2xl overflow-hidden relative shadow-sm shrink-0"
            >
              <ParticipantTile 
                trackRef={trackRef}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
