"use client";

import {
  ParticipantTile,
  useTracks,
  useLocalParticipant,
  useDataChannel,
  GridLayout,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo, useState } from "react";
import { Hand, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [isGalleryMode, setIsGalleryMode] = useState(false);

  // For the spotlight layout, pick the first track (or screen share if active) as the main view.
  const mainTrack = tracks.find((t) => t.source === Track.Source.ScreenShare) || tracks[0];
  
  // The rest of the tracks go into the thumbnails.
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
      <div className="flex h-full w-full items-center justify-center bg-slate-100 rounded-[2rem]">
        <p className="text-slate-500 font-medium">Waiting for others to join...</p>
      </div>
    );
  }

  // --- GALLERY MODE ---
  if (isGalleryMode || tracks.length > 12) {
    return (
      <div className="flex flex-col h-full w-full relative bg-slate-900 rounded-[2rem] p-4 md:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 z-20 shrink-0">
          <h2 className="text-white font-bold text-lg md:text-xl pl-2">Gallery View</h2>
          <button 
            onClick={() => setIsGalleryMode(false)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm"
          >
            Back to Focus
          </button>
        </div>
        <div className="flex-1 relative min-h-0 w-full overflow-hidden">
          <GridLayout tracks={tracks}>
            <ParticipantTile className="rounded-[1.25rem] md:rounded-2xl shadow-sm w-full h-full object-cover" />
          </GridLayout>
        </div>
      </div>
    );
  }

  // --- FOCUS MODE ---
  // If <= 5 other tracks, show all. If > 5, show 4 and a "+X" tile.
  const showMoreButton = otherTracks.length > 5;
  const visibleCount = showMoreButton ? 4 : otherTracks.length;
  const visibleThumbnails = otherTracks.slice(0, visibleCount);
  const hiddenCount = otherTracks.length - visibleCount;

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-2 md:gap-4">
      {/* Main Spotlight Video */}
      {mainTrack && (
        <div className="flex-1 w-full h-full bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-sm min-h-0 min-w-0 transition-all duration-300">
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

      {/* Thumbnails Column (Desktop) / Row (Mobile) */}
      {(visibleThumbnails.length > 0 || showMoreButton) && (
        <div className="flex flex-row md:flex-col gap-2 md:gap-4 h-32 md:h-full md:w-56 lg:w-64 shrink-0 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0 pr-1 md:pr-2 scrollbar-hide">
          
          {visibleThumbnails.map((trackRef, idx) => (
            <div 
              key={`${trackRef.participant.identity}-${trackRef.source}-${idx}`}
              className="h-full md:h-auto aspect-square md:aspect-[4/3] bg-slate-100 rounded-[1.25rem] md:rounded-2xl overflow-hidden relative shadow-sm shrink-0 transition-all duration-300"
            >
              <ParticipantTile 
                trackRef={trackRef}
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          {/* Show More Button */}
          {showMoreButton && (
            <button
              onClick={() => setIsGalleryMode(true)}
              className="h-full md:h-auto aspect-square md:aspect-[4/3] bg-slate-200/80 hover:bg-slate-300/80 border-2 border-slate-300/50 rounded-[1.25rem] md:rounded-2xl flex flex-col items-center justify-center text-slate-600 transition-all shadow-sm shrink-0"
            >
              <Users size={28} className="mb-2 opacity-80" />
              <span className="font-bold text-lg">+{hiddenCount}</span>
            </button>
          )}

        </div>
      )}
    </div>
  );
}
