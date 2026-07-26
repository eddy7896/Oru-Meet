"use client";

import {
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";

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

  if (tracks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 rounded-3xl">
        <p className="text-slate-500 font-medium">Waiting for others to join...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Main Spotlight Video */}
      {mainTrack && (
        <div className="flex-1 w-full bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-sm">
          <ParticipantTile 
            trackRef={mainTrack} 
            className="w-full h-full object-cover" 
          />
        </div>
      )}

      {/* Bottom Row Videos */}
      {otherTracks.length > 0 && (
        <div className="flex gap-4 h-40 md:h-48 shrink-0 overflow-x-auto pb-2 scrollbar-hide">
          {otherTracks.map((trackRef, idx) => (
            <div 
              key={`${trackRef.participant.identity}-${trackRef.source}-${idx}`}
              className="h-full aspect-square md:aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden relative shadow-sm shrink-0"
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
