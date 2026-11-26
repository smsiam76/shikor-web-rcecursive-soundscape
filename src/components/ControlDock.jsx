"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiCompass,
  FiDisc,
  FiDownload,
  FiGitBranch,
  FiPlay,
  FiRefreshCw,
  FiSliders,
  FiSquare,
} from "react-icons/fi";
import { PRESET_LIST } from "@/constants/presets";
import AmbientMixer from "@/components/AmbientMixer";

function SliderField({ id, label, value, displayValue, min, max, step, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-black/20 px-3 py-2">
      <div className="flex items-center justify-between text-[11px]">
        <label htmlFor={id} className="text-neutral-400">
          {label}
        </label>
        <span className="font-mono text-neutral-200">{displayValue}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calm-slider w-full"
      />
    </div>
  );
}

export default function ControlDock({
  isPlaying,
  mode,
  traversal,
  scale,
  presetId,
  params,
  ambient,
  ambientStatus,
  exportState,
  trayOpen,
  onTrayToggle,
  onPlayToggle,
  onNewTune,
  onModeChange,
  onTraversalChange,
  onScaleChange,
  onPresetSelect,
  onParamChange,
  onToggleAmbient,
  onAmbientVolume,
  onExportWav,
  onOpenIntro,
}) {
  const maxDepth = mode === "tree" ? 8 : 6;
  const clampedDepth = Math.min(params.depth, maxDepth);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      aria-label="Soundscape controls"
      className="fixed bottom-4 left-1/2 z-20 w-[min(94vw,860px)] -translate-x-1/2"
    >
      <div className="glass-panel rounded-2xl px-3.5 py-3 text-xs text-neutral-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPlayToggle}
              aria-label={isPlaying ? "Stop playback" : "Play soundscape"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/16 px-3.5 py-1.5 font-medium text-white hover:bg-white/24 transition cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <FiSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <FiPlay className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onNewTune}
              aria-label="Generate a new melodic composition"
              title="Compose a new melody and key (N)"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-neutral-300 hover:bg-white/12 hover:text-white transition cursor-pointer"
            >
              <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Tune</span>
            </button>

            <div
              className="flex items-center gap-0.5 rounded-xl bg-black/25 p-1"
              role="group"
              aria-label="Recursive shape"
            >
              <button
                type="button"
                onClick={() => onModeChange("tree")}
                aria-pressed={mode === "tree"}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  mode === "tree"
                    ? "bg-white/16 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <FiGitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tree</span>
              </button>
              <button
                type="button"
                onClick={() => onModeChange("ripples")}
                aria-pressed={mode === "ripples"}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  mode === "ripples"
                    ? "bg-white/16 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <FiDisc className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ripples</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportWav}
              disabled={exportState === "rendering"}
              aria-label="Export soundscape as WAV file"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-neutral-200 hover:bg-white/14 hover:text-white disabled:opacity-50 transition cursor-pointer"
            >
              <FiDownload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {exportState === "rendering"
                  ? "Rendering..."
                  : exportState === "done"
                    ? "Saved .wav"
                    : exportState === "error"
                      ? "Retry .wav"
                      : "Export .wav"}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenIntro}
              aria-label="Open setup screen"
              title="Return to setup screen"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-neutral-400 hover:bg-white/12 hover:text-white transition cursor-pointer"
            >
              <FiCompass className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Setup</span>
            </button>

            <button
              type="button"
              onClick={onTrayToggle}
              aria-expanded={trayOpen}
              aria-label={trayOpen ? "Collapse controls" : "Expand controls"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-neutral-300 hover:bg-white/12 hover:text-white transition cursor-pointer"
            >
              <FiSliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Controls</span>
              {trayOpen ? (
                <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <FiChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {trayOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Pattern
                  </span>
                  <div
                    className="flex items-center gap-0.5 rounded-xl bg-black/25 p-1"
                    role="group"
                    aria-label="Traversal pattern"
                  >
                    <button
                      type="button"
                      onClick={() => onTraversalChange("dfs")}
                      aria-pressed={traversal === "dfs"}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        traversal === "dfs"
                          ? "bg-white/16 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      DFS <span className="text-neutral-400">· Melody</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTraversalChange("bfs")}
                      aria-pressed={traversal === "bfs"}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        traversal === "bfs"
                          ? "bg-white/16 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      BFS <span className="text-neutral-400">· Chords</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Scale
                  </span>
                  <div
                    className="flex items-center gap-0.5 rounded-xl bg-black/25 p-1"
                    role="group"
                    aria-label="Musical scale"
                  >
                    <button
                      type="button"
                      onClick={() => onScaleChange("pentatonic")}
                      aria-pressed={scale === "pentatonic"}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        scale === "pentatonic"
                          ? "bg-white/16 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Pentatonic <span className="text-neutral-400">· Warm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onScaleChange("hirajoshi")}
                      aria-pressed={scale === "hirajoshi"}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        scale === "hirajoshi"
                          ? "bg-white/16 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Hirajoshi <span className="text-neutral-400">· Plucked</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                <SliderField
                  id="slider-depth"
                  label="Depth (n)"
                  min={1}
                  max={maxDepth}
                  step={1}
                  value={clampedDepth}
                  displayValue={clampedDepth}
                  onChange={(val) => onParamChange("depth", val)}
                />

                {mode === "tree" ? (
                  <>
                    <SliderField
                      id="slider-angle"
                      label="Angle"
                      min={10}
                      max={55}
                      step={1}
                      value={params.branchAngle}
                      displayValue={`${params.branchAngle}°`}
                      onChange={(val) => onParamChange("branchAngle", val)}
                    />
                    <SliderField
                      id="slider-decay"
                      label="Decay"
                      min={0.55}
                      max={0.82}
                      step={0.01}
                      value={params.lengthDecay}
                      displayValue={params.lengthDecay.toFixed(2)}
                      onChange={(val) => onParamChange("lengthDecay", val)}
                    />
                  </>
                ) : (
                  <>
                    <SliderField
                      id="slider-spread"
                      label="Spread"
                      min={0.38}
                      max={0.82}
                      step={0.01}
                      value={params.spreadRatio}
                      displayValue={params.spreadRatio.toFixed(2)}
                      onChange={(val) => onParamChange("spreadRatio", val)}
                    />
                    <SliderField
                      id="slider-rdecay"
                      label="Decay"
                      min={0.42}
                      max={0.7}
                      step={0.01}
                      value={params.rippleDecay}
                      displayValue={params.rippleDecay.toFixed(2)}
                      onChange={(val) => onParamChange("rippleDecay", val)}
                    />
                  </>
                )}

                <SliderField
                  id="slider-sway"
                  label="Sway"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.windSway}
                  displayValue={`${Math.round(params.windSway * 100)}%`}
                  onChange={(val) => onParamChange("windSway", val)}
                />

                <SliderField
                  id="slider-tempo"
                  label="Tempo"
                  min={40}
                  max={110}
                  step={2}
                  value={params.tempo}
                  displayValue={`${params.tempo} bpm`}
                  onChange={(val) => onParamChange("tempo", val)}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Mood
                  </span>
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="group"
                    aria-label="Mood presets"
                  >
                    {PRESET_LIST.map((preset) => {
                      const active = presetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onPresetSelect(preset.id)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                            active
                              ? "bg-white/16 text-white"
                              : "bg-black/20 text-neutral-400 hover:bg-white/8 hover:text-neutral-200"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: preset.palette.accent }}
                            aria-hidden="true"
                          />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Ambience
                  </span>
                  <AmbientMixer
                    ambient={ambient}
                    ambientStatus={ambientStatus}
                    onToggleTrack={onToggleAmbient}
                    onVolumeChange={onAmbientVolume}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}