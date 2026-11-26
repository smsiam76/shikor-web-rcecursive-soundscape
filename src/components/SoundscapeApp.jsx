"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PRESET_ID, PRESET_LIST, getPreset } from "@/constants/presets";
import { generateFractalTree } from "@/lib/recursion/fractalTree";
import { generateRecursiveRipples } from "@/lib/recursion/recursiveRipples";
import { buildTraversalSteps, getSubtreeIds } from "@/lib/recursion/traversal";
import SoundscapeCanvas from "@/components/SoundscapeCanvas";

export default function SoundscapeApp() {
  const initialPreset = getPreset(DEFAULT_PRESET_ID);

  const [presetId, setPresetId] = useState(initialPreset.id);
  const [mode, setMode] = useState(initialPreset.mode);
  const [traversal, setTraversal] = useState(initialPreset.traversal);
  const [params, setParams] = useState(initialPreset.params);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [pulseEvent, setPulseEvent] = useState({ id: 0, ids: [] });

  const previewTimerRef = useRef(null);

  const activePreset = useMemo(() => getPreset(presetId), [presetId]);

  const structure = useMemo(() => {
    return mode === "tree"
      ? generateFractalTree(params)
      : generateRecursiveRipples(params);
  }, [mode, params]);

  const selectedSubtreeIds = useMemo(() => {
    if (!selectedNodeId) return new Set();
    return getSubtreeIds(structure, selectedNodeId);
  }, [structure, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId && !structure.nodeMap[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [structure, selectedNodeId]);

  function stopPreview() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setIsPreviewing(false);
  }

  function runVisualTraversal(startNodeId = selectedNodeId) {
    stopPreview();
    const steps = buildTraversalSteps(structure, traversal, startNodeId);
    if (steps.length === 0) return;

    setIsPreviewing(true);
    let idx = 0;

    function tick() {
      const step = steps[idx];
      setPulseEvent((prev) => ({
        id: prev.id + 1,
        ids: step.nodes.map((n) => n.id),
      }));

      idx += 1;
      if (idx < steps.length) {
        const delayMs = traversal === "bfs" ? 620 : Math.max(120, Math.round(step.lengthRatio * 360));
        previewTimerRef.current = setTimeout(tick, delayMs);
      } else {
        previewTimerRef.current = setTimeout(() => setIsPreviewing(false), 600);
      }
    }

    tick();
  }

  useEffect(() => {
    return () => stopPreview();
  }, []);

  function handlePresetSelect(nextPresetId) {
    stopPreview();
    const preset = getPreset(nextPresetId);
    setPresetId(preset.id);
    setMode(preset.mode);
    setTraversal(preset.traversal);
    setParams(preset.params);
    setSelectedNodeId(null);
  }

  function handleNodeClick(node) {
    if (!node) {
      stopPreview();
      setSelectedNodeId(null);
      return;
    }
    setSelectedNodeId(node.id);
    runVisualTraversal(node.id);
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden select-none">
      <SoundscapeCanvas
        structure={structure}
        params={params}
        palette={activePreset.palette}
        selectedSubtreeIds={selectedSubtreeIds}
        pulseEvent={pulseEvent}
        onNodeClick={handleNodeClick}
      />

      <div className="glass-pill fixed top-4 left-4 z-10 rounded-full px-4 py-2 text-xs text-neutral-300 font-mono">
        depth {structure.maxDepth} · nodes {structure.count}
        {selectedNodeId ? ` · subtree ${selectedSubtreeIds.size}` : ""}
      </div>

      <div className="glass-panel fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-xs text-neutral-200">
        <button
          type="button"
          onClick={() => (isPreviewing ? stopPreview() : runVisualTraversal())}
          className="rounded-lg bg-white/12 px-3 py-1.5 font-medium hover:bg-white/20 transition"
        >
          {isPreviewing ? "Stop Preview" : "Visual Pulse"}
        </button>

        <div className="flex items-center gap-1 rounded-lg bg-black/25 p-1">
          {["tree", "ripples"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                stopPreview();
                setMode(item);
                setSelectedNodeId(null);
              }}
              className={`rounded-md px-2.5 py-1 capitalize transition ${
                mode === item ? "bg-white/15 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-black/25 p-1">
          {["dfs", "bfs"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTraversal(item)}
              className={`rounded-md px-2.5 py-1 uppercase transition ${
                traversal === item ? "bg-white/15 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {PRESET_LIST.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`rounded-lg px-2.5 py-1 transition ${
                presetId === preset.id
                  ? "bg-white/18 text-white"
                  : "text-neutral-400 hover:bg-white/8 hover:text-neutral-200"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-neutral-300">
          Depth
          <input
            type="range"
            min={1}
            max={mode === "tree" ? 8 : 6}
            value={Math.min(params.depth, mode === "tree" ? 8 : 6)}
            onChange={(e) => setParams((p) => ({ ...p, depth: Number(e.target.value) }))}
            className="w-20 accent-neutral-200"
          />
        </label>

        {mode === "tree" && (
          <label className="flex items-center gap-2 text-neutral-300">
            Angle
            <input
              type="range"
              min={10}
              max={55}
              value={params.branchAngle}
              onChange={(e) => setParams((p) => ({ ...p, branchAngle: Number(e.target.value) }))}
              className="w-20 accent-neutral-200"
            />
          </label>
        )}
      </div>
    </main>
  );
}