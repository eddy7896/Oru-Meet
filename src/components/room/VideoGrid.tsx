"use client";

import {
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * VideoGrid — renders all participant video and audio tiles in a responsive grid.
 * Uses LiveKit's GridLayout + useTracks which handle pagination and visual stability.
 */
export default function VideoGrid() {
  // Include camera + screen share tracks, with placeholders for participants
  // who haven't enabled their camera yet
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden p-3">
      <GridLayout
        tracks={tracks}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}
