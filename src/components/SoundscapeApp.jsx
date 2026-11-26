"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_PRESET_ID, PRESET_LIST, getPreset } from "@/constants/presets";
import { generateFractalTree } from "@/lib/recursion/fractalTree";
import { generateRecursiveRipples } from "@/lib/recursion/recursiveRipples";
import { buildTraversalSteps, getSubtreeIds } from "@/lib/recursion/traversal";
import { getCompositionMeta } from "@/lib/audio/noteMapper";
import { soundEngine } from "@/lib/audio/soundEngine";
import { exportSoundscapeWav } from "@/lib/audio/wavExporter";
import SoundscapeCanvas from "@/components/SoundscapeCanvas";
import EntryOverlay from "@/components/EntryOverlay";
import StatusHud from "@/components/StatusHud";
import ControlDock from "@/components/ControlDock";

export default function SoundscapeApp() {
  const initialPreset = getPreset(DEFAULT_PRESET_ID);

  const [entered, setEntered] = useState(false);
  const [autoPlayOnEnter, setAutoPlayOnEnter] = useState(true);
  const [growthResetKey, setGrowthResetKey] = useState(0);
  const [trayOpen, setTrayOpen] = useState(true);
  const [showCanvasHint, setShowCanvasHint] = useState(true);

  const [presetId, setPresetId] = useState(initialPreset.id);
  const [mode, setMode] = useState(initialPreset.mode);
  const [traversal, setTraversal] = useState(initialPreset.traversal);
  const [scale, setScale] = useState(initialPreset.scale);
  const [rootNote, setRootNote] = useState(initialPreset.rootNote);
  const [params, setParams] = useState(initialPreset.params);
  const [ambient, setAmbient] = useState(initialPreset.ambient);
  const [ambientStatus, setAmbientStatus] = useState({
    rain: "idle",
    wind: "idle",
    forest: "idle",
  });

  const [seed, setSeed] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [exportState, setExportState] = useState("idle");
  const [activeNote, setActiveNote] = useState("—");
  const [activeDepth, setActiveDepth] = useState(0);
  const [pulseEvent, setPulseEvent] = useState({ id: 0, ids: [] });

  const isPlayingRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const resyncTimerRef = useRef(null);
  const exportResetRef = useRef(null);

  const activePreset = useMemo(() => getPreset(presetId), [presetId]);
  const compositionMeta = useMemo(() => getCompositionMeta(seed, rootNote), [seed, rootNote]);

  const structure = useMemo(() => {
    return mode === "tree"
      ? generateFractalTree(params)
      : generateRecursiveRipples(params);
  }, [mode, params]);

  const selectedSubtreeIds = useMemo(() => {
    if (!selectedNodeId) return new Set();
    return getSubtreeIds(structure, selectedNodeId);
  }, [structure, selectedNodeId]);

  const dockReservePx = useMemo(() => {
    if (!entered || isZenMode) return 0;
    return trayOpen ? 235 : 80;
  }, [entered, isZenMode, trayOpen]);

  useEffect(() => {
    if (selectedNodeId && !structure.nodeMap[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [structure, selectedNodeId]);

  useEffect(() => {
    if (!entered || !showCanvasHint) return undefined;
    const timer = setTimeout(() => setShowCanvasHint(false), 9000);
    return () => clearTimeout(timer);
  }, [entered, showCanvasHint]);

  const startSequence = useCallback(
    async ({
      nextStructure = structure,
      nextTraversal = traversal,
      nextScale = scale,
      nextRootNote = rootNote,
      nextParams = params,
      nextMode = mode,
      nextSeed = seed,
      startNodeId = null,
      loop = true,
    } = {}) => {
      const meta = getCompositionMeta(nextSeed, nextRootNote);
      const steps = buildTraversalSteps(nextStructure, nextTraversal, startNodeId, {
        strumOrder: meta.profile.strumOrder,
      });
      if (steps.length === 0) return;

      audioUnlockedRef.current = true;
      isPlayingRef.current = true;
      setIsPlaying(true);

      await soundEngine.playSequence(
        steps,
        {
          scale: nextScale,
          rootNote: nextRootNote,
          tempo: nextParams.tempo,
          traversal: nextTraversal,
          mode: nextMode,
          params: nextParams,
          seed: nextSeed,
          loop,
        },
        {
          onStep: ({ ids, note, depth }) => {
            setActiveNote(note || "—");
            setActiveDepth(depth);
            setPulseEvent((prev) => ({
              id: prev.id + 1,
              ids,
            }));
          },
          onComplete: () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
          },
        }
      );

      const statuses = await soundEngine.syncAmbient(ambient);
      setAmbientStatus(statuses);
    },
    [structure, traversal, scale, rootNote, params, mode, seed, ambient]
  );

  const stopSequence = useCallback(() => {
    if (resyncTimerRef.current) {
      clearTimeout(resyncTimerRef.current);
      resyncTimerRef.current = null;
    }
    soundEngine.stopPlayback();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!audioUnlockedRef.current) return;
    soundEngine.syncAmbient(ambient, { retryMissing: true }).then(setAmbientStatus);
  }, [ambient]);

  useEffect(() => {
    if (!entered || !isPlayingRef.current) return undefined;

    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      startSequence({
        startNodeId: selectedNodeId,
        loop: !selectedNodeId,
      });
    }, 90);

    return () => {
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    };
  }, [
    entered,
    structure,
    traversal,
    scale,
    rootNote,
    params,
    mode,
    seed,
    selectedNodeId,
    startSequence,
  ]);

  useEffect(() => {
    return () => {
      soundEngine.stopPlayback();
      if (exportResetRef.current) clearTimeout(exportResetRef.current);
    };
  }, []);

  const handleEntryMoodSelect = useCallback((nextPresetId) => {
    const preset = getPreset(nextPresetId);
    setPresetId(preset.id);
    setScale(preset.scale);
    setRootNote(preset.rootNote);
    setAmbient(preset.ambient);
    setParams((prev) => ({
      ...preset.params,
      depth: prev.depth,
    }));
  }, []);

  const handleEnter = useCallback(() => {
    setSelectedNodeId(null);
    setIsZenMode(false);
    setShowCanvasHint(true);
    setGrowthResetKey((prev) => prev + 1);
    setEntered(true);

    if (autoPlayOnEnter) {
      startSequence({
        nextStructure: structure,
        nextTraversal: traversal,
        nextScale: scale,
        nextRootNote: rootNote,
        nextParams: params,
        nextMode: mode,
        nextSeed: seed,
        startNodeId: null,
        loop: true,
      });
    }
  }, [
    autoPlayOnEnter,
    startSequence,
    structure,
    traversal,
    scale,
    rootNote,
    params,
    mode,
    seed,
  ]);

  const handleOpenIntro = useCallback(() => {
    stopSequence();
    setSelectedNodeId(null);
    setIsZenMode(false);
    setEntered(false);
  }, [stopSequence]);

  const handlePlayToggle = useCallback(() => {
    if (isPlayingRef.current) {
      stopSequence();
      return;
    }

    const freshSeed = seed + 1;
    setSeed(freshSeed);
    startSequence({
      nextSeed: freshSeed,
      startNodeId: selectedNodeId,
      loop: !selectedNodeId,
    });
  }, [seed, selectedNodeId, startSequence, stopSequence]);

  const handleNewTune = useCallback(() => {
    const freshSeed = seed + 1;
    setSeed(freshSeed);
    if (!isPlayingRef.current) {
      startSequence({
        nextSeed: freshSeed,
        startNodeId: selectedNodeId,
        loop: !selectedNodeId,
      });
    }
  }, [seed, selectedNodeId, startSequence]);

  const handleScaleChange = useCallback(
    (nextScale) => {
      setScale(nextScale);
      if (!isPlayingRef.current) {
        audioUnlockedRef.current = true;
        soundEngine.previewScale(nextScale, compositionMeta.rootNote);
      }
    },
    [compositionMeta.rootNote]
  );

  const handlePresetSelect = useCallback((nextPresetId) => {
    const preset = getPreset(nextPresetId);
    setPresetId(preset.id);
    setMode(preset.mode);
    setTraversal(preset.traversal);
    setScale(preset.scale);
    setRootNote(preset.rootNote);
    setParams(preset.params);
    setAmbient(preset.ambient);
    setSelectedNodeId(null);
    setSeed((prev) => prev + 1);
    setGrowthResetKey((prev) => prev + 1);
  }, []);

  const handleModeChange = useCallback((nextMode) => {
    setMode((prev) => {
      if (prev !== nextMode) {
        setGrowthResetKey((k) => k + 1);
      }
      return nextMode;
    });
    setSelectedNodeId(null);
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleNodeClick = useCallback(
    (node) => {
      setShowCanvasHint(false);

      if (!node) {
        setSelectedNodeId(null);
        if (isPlayingRef.current) {
          startSequence({ startNodeId: null, loop: true });
        }
        return;
      }

      setSelectedNodeId(node.id);
      startSequence({ startNodeId: node.id, loop: false });
    },
    [startSequence]
  );

  const handleToggleAmbient = useCallback((trackId) => {
    audioUnlockedRef.current = true;
    setAmbient((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        enabled: !prev[trackId].enabled,
      },
    }));
  }, []);

  const handleAmbientVolume = useCallback((trackId, volume) => {
    setAmbient((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        volume,
      },
    }));
  }, []);

  const handleExportWav = useCallback(async () => {
    if (exportState === "rendering") return;
    setExportState("rendering");

    try {
      await exportSoundscapeWav({
        structure,
        traversal,
        scale,
        rootNote,
        params,
        mode,
        seed,
        selectedNodeId,
        ambient,
        presetName: activePreset.name,
      });
      setExportState("done");
    } catch {
      setExportState("error");
    }

    if (exportResetRef.current) clearTimeout(exportResetRef.current);
    exportResetRef.current = setTimeout(() => {
      setExportState("idle");
    }, 2600);
  }, [
    exportState,
    structure,
    traversal,
    scale,
    rootNote,
    params,
    mode,
    seed,
    selectedNodeId,
    ambient,
    activePreset.name,
  ]);

  useEffect(() => {
    function onKeyDown(event) {
      if (!entered) return;

      const tag = event.target?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (event.key === "Escape") {
        if (isZenMode) {
          setIsZenMode(false);
        } else if (selectedNodeId) {
          handleNodeClick(null);
        }
        return;
      }

      if (isInput || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        if (tag === "BUTTON") return;
        event.preventDefault();
        handlePlayToggle();
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z") {
        setIsZenMode((prev) => !prev);
      } else if (key === "n") {
        handleNewTune();
      } else if (key === "m") {
        handleModeChange(mode === "tree" ? "ripples" : "tree");
      } else if (key === "t") {
        setTraversal((prev) => (prev === "dfs" ? "bfs" : "dfs"));
      } else if (key === "s") {
        handleScaleChange(scale === "pentatonic" ? "hirajoshi" : "pentatonic");
      } else if (key === "1" || key === "2" || key === "3") {
        const preset = PRESET_LIST[Number(key) - 1];
        if (preset) handlePresetSelect(preset.id);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    entered,
    isZenMode,
    selectedNodeId,
    mode,
    scale,
    handlePlayToggle,
    handleNewTune,
    handleModeChange,
    handleScaleChange,
    handlePresetSelect,
    handleNodeClick,
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden select-none">
      <SoundscapeCanvas
        structure={structure}
        params={params}
        palette={activePreset.palette}
        selectedSubtreeIds={selectedSubtreeIds}
        pulseEvent={pulseEvent}
        entered={entered}
        growthResetKey={growthResetKey}
        dockReservePx={dockReservePx}
        onNodeClick={handleNodeClick}
      />

      <AnimatePresence>
        {!entered && (
          <EntryOverlay
            mode={mode}
            depth={params.depth}
            traversal={traversal}
            presetId={presetId}
            accentColor={activePreset.palette.accent}
            autoPlay={autoPlayOnEnter}
            onModeChange={(nextMode) => setMode(nextMode)}
            onDepthChange={(val) => handleParamChange("depth", val)}
            onTraversalChange={setTraversal}
            onMoodSelect={handleEntryMoodSelect}
            onAutoPlayChange={setAutoPlayOnEnter}
            onEnter={handleEnter}
          />
        )}
      </AnimatePresence>

      {entered && (
        <StatusHud
          activeDepth={activeDepth}
          maxDepth={structure.maxDepth}
          nodeCount={structure.count}
          activeNote={activeNote}
          rootNote={compositionMeta.rootNote}
          scale={scale}
          profileName={compositionMeta.profile.name}
          selectedSubtreeCount={selectedSubtreeIds.size}
          isPlaying={isPlaying}
          isZenMode={isZenMode}
          accentColor={activePreset.palette.accent}
          onClearSubtree={() => handleNodeClick(null)}
          onToggleZen={() => setIsZenMode((prev) => !prev)}
        />
      )}

      <AnimatePresence>
        {entered && !isZenMode && showCanvasHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none fixed top-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/30 px-3.5 py-1 text-[11px] text-neutral-400 backdrop-blur-md"
          >
            {mode === "tree"
              ? "Click any branch to play its sub-tree · Hover to stir the breeze"
              : "Click any ring to play its sub-tree · Hover to disturb the surface"}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {entered && !isZenMode && (
          <ControlDock
            isPlaying={isPlaying}
            mode={mode}
            traversal={traversal}
            scale={scale}
            presetId={presetId}
            params={params}
            ambient={ambient}
            ambientStatus={ambientStatus}
            exportState={exportState}
            trayOpen={trayOpen}
            onTrayToggle={() => setTrayOpen((prev) => !prev)}
            onPlayToggle={handlePlayToggle}
            onNewTune={handleNewTune}
            onModeChange={handleModeChange}
            onTraversalChange={setTraversal}
            onScaleChange={handleScaleChange}
            onPresetSelect={handlePresetSelect}
            onParamChange={handleParamChange}
            onToggleAmbient={handleToggleAmbient}
            onAmbientVolume={handleAmbientVolume}
            onExportWav={handleExportWav}
            onOpenIntro={handleOpenIntro}
          />
        )}
      </AnimatePresence>
    </main>
  );
}