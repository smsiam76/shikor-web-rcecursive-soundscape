"use client";

import { FiCloudRain, FiFeather, FiWind } from "react-icons/fi";
import { AMBIENT_TRACKS } from "@/lib/audio/soundEngine";

const TRACK_ICONS = {
  rain: FiCloudRain,
  wind: FiWind,
  forest: FiFeather,
};

export default function AmbientMixer({
  ambient,
  ambientStatus,
  onToggleTrack,
  onVolumeChange,
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2.5"
      role="group"
      aria-label="Ambient sound layers"
    >
      {Object.values(AMBIENT_TRACKS).map((track) => {
        const Icon = TRACK_ICONS[track.id] || FiWind;
        const cfg = ambient[track.id] || { enabled: false, volume: 0.25 };
        const status = ambientStatus[track.id] || "idle";
        const isMissing = status === "missing";

        return (
          <div
            key={track.id}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition ${
              cfg.enabled
                ? "bg-white/12 text-neutral-100"
                : "bg-black/22 text-neutral-400 hover:bg-white/8 hover:text-neutral-200"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleTrack(track.id)}
              aria-pressed={cfg.enabled}
              aria-label={`Toggle ${track.label} ambient loop`}
              title={
                isMissing
                  ? `Add /public/sounds/${track.id}.mp3 to enable ${track.label}`
                  : `Toggle ${track.label}`
              }
              className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5 opacity-85" aria-hidden="true" />
              <span>{track.label}</span>
              {isMissing && (
                <span className="text-[10px] text-neutral-400 font-mono" aria-hidden="true">
                  (no file)
                </span>
              )}
            </button>

            {cfg.enabled && !isMissing && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={cfg.volume}
                onChange={(e) => onVolumeChange(track.id, Number(e.target.value))}
                aria-label={`${track.label} volume`}
                className="calm-slider w-16"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}