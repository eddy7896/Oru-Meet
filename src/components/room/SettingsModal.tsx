"use client";

import { useEffect, useState } from "react";
import { CloseCircle, Video, Microphone2, Setting2 } from "iconsax-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-[#FAFAFA] shrink-0">
          <div className="flex items-center gap-2">
            <Setting2 size={24} variant="Bold" color="#1A73E8" />
            <h2 className="text-lg font-bold text-slate-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <CloseCircle size={24} variant="Linear" />
          </button>
        </div>

        <div className="space-y-6 p-6 overflow-y-auto flex-1">
          {/* Camera Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Video size={18} variant="Bold" color="#64748B" />
              Camera
            </label>
            <select
              value={activeVideo}
              onChange={(e) => handleVideoChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
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
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Microphone2 size={18} variant="Bold" color="#64748B" />
              Microphone
            </label>
            <select
              value={activeAudio}
              onChange={(e) => handleAudioChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="my-2 h-px w-full bg-slate-100" />

          {/* Video Effects */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Video Effects</h3>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900">Background Blur</p>
                <p className="text-xs font-medium text-slate-500">Blur your surroundings</p>
              </div>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  toggleBlur();
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  isBlurActive ? "bg-[#1A73E8]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isBlurActive ? "left-[3px] translate-x-[20px]" : "left-[3px] translate-x-0"
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
