"use client";

import { useEffect, useState } from "react";
import { X, Camera, Mic, Settings } from "lucide-react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { BackgroundBlur } from "@livekit/track-processors";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeVideo, setActiveVideo] = useState<string>("");
  const [activeAudio, setActiveAudio] = useState<string>("");
  const [isBlurActive, setIsBlurActive] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [processor, setProcessor] = useState<any | null>(null);

  // Load devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, []);

  // Update active devices from room state
  useEffect(() => {
    if (room.getActiveDevice('videoinput')) {
      setActiveVideo(room.getActiveDevice('videoinput')!);
    }
    if (room.getActiveDevice('audioinput')) {
      setActiveAudio(room.getActiveDevice('audioinput')!);
    }
  }, [room]);

  async function handleVideoChange(deviceId: string) {
    await room.switchActiveDevice("videoinput", deviceId);
    setActiveVideo(deviceId);
  }

  async function handleAudioChange(deviceId: string) {
    await room.switchActiveDevice("audioinput", deviceId);
    setActiveAudio(deviceId);
  }

  async function toggleBlur() {
    if (!localParticipant) return;
    
    try {
      if (isBlurActive) {
        // Remove processor
        const videoTrack = localParticipant.getTrackPublication(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).LiveKitTrackSource?.Camera ?? "camera"
        )?.track;
        if (videoTrack) {
          await videoTrack.setProcessor(undefined as any);
        }
        setIsBlurActive(false);
      } else {
        // Initialize and add processor
        const newProcessor = processor || BackgroundBlur(10, { delegate: 'GPU' });
        if (!processor) setProcessor(newProcessor);
        
        const videoTrack = localParticipant.getTrackPublication(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).LiveKitTrackSource?.Camera ?? "camera"
        )?.track;
        
        if (videoTrack) {
          await videoTrack.setProcessor(newProcessor as any);
          setIsBlurActive(true);
        }
      }
    } catch (err) {
      console.error("Failed to toggle background blur", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#374151] bg-[#1F2937] shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-text-primary" />
            <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Camera Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Camera className="h-4 w-4" />
              Camera
            </label>
            <select
              value={activeVideo}
              onChange={(e) => handleVideoChange(e.target.value)}
              className="w-full rounded-xl border border-[#374151] bg-[#111827] px-4 py-2.5 text-sm text-text-primary outline-none focus:border-[#1A73E8]"
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Mic className="h-4 w-4" />
              Microphone
            </label>
            <select
              value={activeAudio}
              onChange={(e) => handleAudioChange(e.target.value)}
              className="w-full rounded-xl border border-[#374151] bg-[#111827] px-4 py-2.5 text-sm text-text-primary outline-none focus:border-[#1A73E8]"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="my-4 h-px w-full bg-surface-container" />

          {/* Video Effects */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary">Video Effects</h3>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-container p-4 hover:bg-surface-container">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-text-primary">Background Blur</p>
                <p className="text-xs text-text-secondary">Blur your surroundings</p>
              </div>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleBlur();
                }}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isBlurActive ? "bg-[#1A73E8]" : "bg-surface-container"
                }`}
              >
                <div
                  className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-transform ${
                    isBlurActive ? "left-[2px] translate-x-5" : "left-[2px] translate-x-0"
                  }`}
                />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
