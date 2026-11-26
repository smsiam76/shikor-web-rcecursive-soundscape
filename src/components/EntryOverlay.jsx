"use client";

import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiDisc,
  FiGitBranch,
  FiHeadphones,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { PRESET_LIST } from "@/constants/presets";

function estimateNodeCount(mode, depth) {
  if (mode === "tree") {
    return Math.pow(2, depth + 1) - 1;
  }
  return depth === 0 ? 1 : 1 + 3 * (Math.pow(2, depth) - 1);
}

export default function EntryOverlay({
  mode,
  depth,
  traversal,
  presetId,
  accentColor,
  autoPlay,
  onModeChange,
  onDepthChange,
  onTraversalChange,
  onMoodSelect,
  onAutoPlayChange,
  onEnter,
}) {
  const maxDepth = mode === "tree" ? 8 : 6;
  const clampedDepth = Math.min(depth, maxDepth);
  const nodeCount = estimateNodeCount(mode, clampedDepth);

  function handleSubmit(event) {
    event.preventDefault();
    onEnter();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.97 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel glass-scroll max-h-[92vh] w-full max-w-[500px] overflow-y-auto rounded-3xl px-6 py-6 sm:px-7 sm:py-7 text-neutral-100"
      >
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-400">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
            <span>Generative Audio Canvas</span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-medium tracking-tight text-white">
           Shikor Web Recursive Soundscapes
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
            Choose a recursive form and depth, then listen as its geometry unfolds into calm sound.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
              Recursion Function
            </span>
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Recursion type">
              <button
                type="button"
                onClick={() => onModeChange("tree")}
                aria-pressed={mode === "tree"}
                className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  mode === "tree"
                    ? "border-white/22 bg-white/12 text-white"
                    : "border-white/8 bg-black/22 text-neutral-300 hover:bg-white/6"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FiGitBranch className="h-4 w-4 opacity-85" aria-hidden="true" />
                  <span>Fractal Tree</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-neutral-400">
                  Binary branching with wind sway
                </p>
              </button>

              <button
                type="button"
                onClick={() => onModeChange("ripples")}
                aria-pressed={mode === "ripples"}
                className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  mode === "ripples"
                    ? "border-white/22 bg-white/12 text-white"
                    : "border-white/8 bg-black/22 text-neutral-300 hover:bg-white/6"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FiDisc className="h-4 w-4 opacity-85" aria-hidden="true" />
                  <span>Recursive Ripples</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-neutral-400">
                  Nested rings blooming outward
                </p>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label
                htmlFor="entry-depth"
                className="text-[11px] uppercase tracking-wider text-neutral-400"
              >
                Recursion Depth (n)
              </label>
              <span className="font-mono text-xs text-neutral-200">
                n = {clampedDepth} <span className="text-neutral-500">·</span> {nodeCount}{" "}
                {mode === "tree" ? "branches" : "rings"}
              </span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/22 px-4 py-3">
              <input
                id="entry-depth"
                type="range"
                min={1}
                max={maxDepth}
                step={1}
                value={clampedDepth}
                onChange={(e) => onDepthChange(Number(e.target.value))}
                className="calm-slider w-full"
              />
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-neutral-500">
                <span>1 (minimal)</span>
                <span>{maxDepth} (dense)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
                Playback Pattern
              </span>
              <div
                className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/25 p-1"
                role="group"
                aria-label="Playback pattern"
              >
                <button
                  type="button"
                  onClick={() => onTraversalChange("dfs")}
                  aria-pressed={traversal === "dfs"}
                  className={`rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                    traversal === "dfs"
                      ? "bg-white/15 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <div className="text-xs font-medium">DFS</div>
                  <div className="text-[10px] text-neutral-400">Melody</div>
                </button>
                <button
                  type="button"
                  onClick={() => onTraversalChange("bfs")}
                  aria-pressed={traversal === "bfs"}
                  className={`rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                    traversal === "bfs"
                      ? "bg-white/15 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <div className="text-xs font-medium">BFS</div>
                  <div className="text-[10px] text-neutral-400">Chords</div>
                </button>
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-400">
                Mood Atmosphere
              </span>
              <div className="flex flex-col gap-1.5" role="group" aria-label="Mood preset">
                {PRESET_LIST.map((preset) => {
                  const active = presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onMoodSelect(preset.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition cursor-pointer ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-black/22 text-neutral-400 hover:bg-white/8 hover:text-neutral-200"
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
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onAutoPlayChange(!autoPlay)}
                aria-pressed={autoPlay}
                className="inline-flex items-center gap-2 rounded-xl bg-black/22 px-3 py-2 text-xs text-neutral-300 hover:bg-white/8 hover:text-white transition cursor-pointer"
              >
                {autoPlay ? (
                  <FiVolume2 className="h-3.5 w-3.5 text-neutral-100" aria-hidden="true" />
                ) : (
                  <FiVolumeX className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                )}
                <span>Auto-play sound on enter</span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                    autoPlay ? "bg-white/15 text-white" : "bg-white/6 text-neutral-500"
                  }`}
                >
                  {autoPlay ? "ON" : "OFF"}
                </span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-white/18 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/26 transition cursor-pointer"
              >
                <span>Generate</span>
                <FiArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-neutral-500">
              <FiHeadphones className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Best with headphones for stereo panning</span>
            </div>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}