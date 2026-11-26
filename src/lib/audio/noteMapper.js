import { SCALES, ROOT_OPTIONS, getScaleNotes } from "@/constants/scales";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashUnit(seedValue) {
  const x = Math.sin(seedValue * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const COMPOSITION_PROFILES = [
  {
    id: "bloom",
    name: "Bloom",
    branchOrder: "left-first",
    strumOrder: "left-to-right",
    contour: "ascending",
    rhythmPattern: [1.0, 0.72, 0.72, 1.3, 0.85, 1.15],
    motifOffsets: [0, 2, 1, 3, 2, 4],
    restScale: 1.0,
    bassEvery: 6,
  },
  {
    id: "cascade",
    name: "Cascade",
    branchOrder: "left-first",
    strumOrder: "right-to-left",
    contour: "descending",
    rhythmPattern: [0.65, 0.65, 1.25, 0.7, 0.9, 1.4],
    motifOffsets: [4, 2, 3, 1, 2, 0],
    restScale: 1.25,
    bassEvery: 5,
  },
  {
    id: "drift",
    name: "Drift",
    branchOrder: "left-first",
    strumOrder: "center-out",
    contour: "arch",
    rhythmPattern: [1.3, 0.9, 1.1, 0.8, 1.45],
    motifOffsets: [0, 1, 3, 4, 2, 1],
    restScale: 1.45,
    bassEvery: 4,
  },
  {
    id: "echo",
    name: "Echo",
    branchOrder: "left-first",
    strumOrder: "left-to-right",
    contour: "pendulum",
    rhythmPattern: [0.85, 0.55, 1.15, 0.6, 0.85, 1.5],
    motifOffsets: [0, 3, 1, 4, 2, 0],
    restScale: 1.15,
    bassEvery: 6,
  },
  {
    id: "stillness",
    name: "Stillness",
    branchOrder: "left-first",
    strumOrder: "center-out",
    contour: "sparse",
    rhythmPattern: [1.5, 1.1, 0.9, 1.7, 1.2],
    motifOffsets: [0, 2, 4, 1, 3],
    restScale: 1.75,
    bassEvery: 4,
  },
];

export function getCompositionMeta(seed = 1, baseRootNote = "C") {
  const safeSeed = Math.max(1, Math.floor(seed));
  const profile = COMPOSITION_PROFILES[(safeSeed - 1) % COMPOSITION_PROFILES.length];

  const baseIdx = Math.max(0, ROOT_OPTIONS.indexOf(baseRootNote));
  const rootShift = safeSeed === 1 ? 0 : Math.floor(hashUnit(safeSeed * 31.7) * ROOT_OPTIONS.length);
  const rootNote = ROOT_OPTIONS[(baseIdx + rootShift) % ROOT_OPTIONS.length];

  return {
    seed: safeSeed,
    profile,
    rootNote,
  };
}

function getContourDegree(depthT, contour, stepIndex, pan) {
  switch (contour) {
    case "descending":
      return 1 - depthT;
    case "arch":
      return Math.sin(depthT * Math.PI * 0.95);
    case "pendulum":
      return 0.5 + Math.sin(stepIndex * 0.65 + pan * 1.4) * 0.45;
    case "sparse":
      return depthT * 0.65 + (pan + 1) * 0.175;
    case "ascending":
    default:
      return depthT;
  }
}

export function mapNodeToAudio(node, options = {}) {
  const {
    scale = "pentatonic",
    rootNote = "C",
    tempo = 62,
    traversal = "dfs",
    mode = "tree",
    params = {},
    seed = 1,
    passIndex = 0,
    stepIndex = 0,
    zoneIndex = 0,
    profile = COMPOSITION_PROFILES[0],
  } = options;

  const scaleDef = SCALES[scale] || SCALES.pentatonic;
  const timbre = scaleDef.timbre;
  const scaleNotes = getScaleNotes(scale, rootNote, 2, 6);

  const maxDepth = Math.max(1, node.maxDepth || 1);
  const depthT = clamp(node.depth / maxDepth, 0, 1);

  const spreadControl =
    mode === "tree"
      ? clamp(((params.branchAngle ?? 26) - 10) / 45, 0, 1)
      : clamp(((params.spreadRatio ?? 0.56) - 0.35) / 0.5, 0, 1);

  const decayControl =
    mode === "tree"
      ? clamp(((params.lengthDecay ?? 0.74) - 0.52) / 0.32, 0, 1)
      : clamp(((params.rippleDecay ?? 0.56) - 0.4) / 0.32, 0, 1);

  const windControl = clamp(params.windSway ?? 0.4, 0, 1);

  const chordRootOffset = scaleDef.chordRoots[(zoneIndex + passIndex) % scaleDef.chordRoots.length];
  const motifStep = profile.motifOffsets[(stepIndex + passIndex) % profile.motifOffsets.length];
  const contourT = clamp(getContourDegree(depthT, profile.contour, stepIndex, node.pan || 0), 0, 1);

  const variationRoll = hashUnit(
    seed * 73.1 + passIndex * 29.7 + stepIndex * 11.3 + node.depth * 5.9
  );

  let layer = "melody";
  let minIdx = 5;
  let maxIdx = 16;

  if (node.depth <= 1 && traversal === "dfs") {
    layer = "bass";
    minIdx = 1;
    maxIdx = 8;
  } else if (node.isLeaf && maxDepth >= 4) {
    layer = "chime";
    minIdx = 10;
    maxIdx = scaleNotes.length - 2;
  }

  const range = Math.max(4, maxIdx - minIdx);
  const spreadInterval = Math.round((node.branchIndex || 0) * (1 + spreadControl * 2.5));
  const hirajoshiAccent =
    scale === "hirajoshi" && variationRoll > 0.55 ? (stepIndex % 2 === 0 ? 1 : -1) : 0;

  const rawIdx =
    minIdx +
    Math.round(contourT * (range - 4)) +
    chordRootOffset +
    motifStep +
    spreadInterval +
    hirajoshiAccent +
    Math.round((variationRoll - 0.5) * (2 + windControl * 3));

  const noteIdx = clamp(rawIdx, minIdx, maxIdx);
  const note = scaleNotes[noteIdx];

  const beatSec = 60 / clamp(tempo, 35, 130);
  const lengthRatio = clamp(node.lengthRatio ?? 0.5, 0.08, 1);

  const duration =
    traversal === "bfs"
      ? clamp(beatSec * (1.5 + lengthRatio * (2.0 + decayControl)), 0.9, 4.8)
      : layer === "bass"
        ? clamp(beatSec * (1.8 + lengthRatio * 2.2), 1.1, 4.6)
        : clamp(beatSec * (0.45 + lengthRatio * (1.5 + decayControl * 0.9)), 0.28, 3.4);

  const baseVelocity =
    traversal === "bfs" ? 0.28 : layer === "bass" ? 0.44 : layer === "chime" ? 0.26 : 0.46;
  const velocity = clamp(
    baseVelocity * (1 - depthT * 0.24) + (variationRoll - 0.5) * 0.08,
    0.14,
    0.58
  );

  const attack = clamp(
    (0.022 + depthT * 0.11 + windControl * 0.025) * timbre.attackScale,
    0.008,
    0.24
  );
  const release = clamp(
    (0.65 + lengthRatio * 1.4 + depthT * 0.4) * timbre.releaseScale,
    0.45,
    3.4
  );

  const filterCutoff = Math.round(
    clamp(2200 - depthT * 1350 + spreadControl * 280 + timbre.cutoffBias, 650, 3100)
  );
  const pan = clamp((node.pan ?? 0) * (0.78 + spreadControl * 0.35), -0.9, 0.9);

  return {
    nodeId: node.id,
    layer,
    scale,
    note,
    duration,
    velocity,
    attack,
    release,
    filterCutoff,
    pan,
    depth: node.depth,
  };
}

export function buildPlaybackTimeline(steps, options = {}) {
  const {
    scale = "pentatonic",
    rootNote = "C",
    tempo = 62,
    traversal = "dfs",
    mode = "tree",
    params = {},
    seed = 1,
    passIndex = 0,
  } = options;

  const meta = getCompositionMeta(seed, rootNote);
  const profile = meta.profile;
  const activeRoot = options.useSeedRoot === false ? rootNote : meta.rootNote;
  const scaleDef = SCALES[scale] || SCALES.pentatonic;
  const bassScaleNotes = getScaleNotes(scale, activeRoot, 2, 3);

  const beatSec = 60 / clamp(tempo, 35, 130);
  const windControl = clamp(params.windSway ?? 0.4, 0, 1);

  const events = [];
  let cursor = 0.06;
  let maxEndTime = 0;

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const lengthRatio = clamp(step.lengthRatio ?? 0.5, 0.08, 1);
    const zoneIndex = step.zoneIndex ?? 0;

    if (traversal === "dfs" && step.backtrackJump > 0) {
      const breath = clamp(
        beatSec * (0.28 + step.backtrackJump * 0.16) * profile.restScale,
        0.16,
        1.25
      );
      cursor += breath;
    }

    const voices = step.voicedNodes.map((node, voiceIndex) => {
      const mapped = mapNodeToAudio(node, {
        scale,
        rootNote: activeRoot,
        tempo,
        traversal,
        mode,
        params,
        seed,
        passIndex,
        stepIndex: i,
        zoneIndex,
        profile,
      });
      const strumOffset =
        traversal === "bfs" ? voiceIndex * (0.045 + windControl * 0.035) : 0;
      return {
        ...mapped,
        offset: strumOffset,
      };
    });

    const shouldAddBassBed =
      traversal === "bfs"
        ? i % 2 === 0
        : i === 0 || step.backtrackJump >= 2 || i % profile.bassEvery === 0;

    if (shouldAddBassBed) {
      const chordDegree = scaleDef.chordRoots[(zoneIndex + passIndex) % scaleDef.chordRoots.length];
      const bassNote = bassScaleNotes[clamp(chordDegree, 0, bassScaleNotes.length - 1)];
      const fifthNote =
        bassScaleNotes[
          clamp(chordDegree + (scale === "hirajoshi" ? 3 : 2), 0, bassScaleNotes.length - 1)
        ];

      voices.push({
        nodeId: step.nodes[0]?.id || "0",
        layer: "bass",
        scale,
        note: bassNote,
        duration: clamp(beatSec * 2.8, 1.4, 4.8),
        velocity: 0.34,
        attack: 0.14,
        release: 2.2,
        filterCutoff: 880,
        pan: -0.18,
        depth: 0,
        offset: 0,
      });

      if (traversal === "bfs" || i === 0 || step.backtrackJump >= 3) {
        voices.push({
          nodeId: step.nodes[0]?.id || "0",
          layer: "bass",
          scale,
          note: fifthNote,
          duration: clamp(beatSec * 2.4, 1.2, 4.2),
          velocity: 0.22,
          attack: 0.18,
          release: 2.4,
          filterCutoff: 1120,
          pan: 0.22,
          depth: 0,
          offset: 0.06,
        });
      }
    }

    const event = {
      time: cursor,
      stepIndex: step.stepIndex,
      depth: step.depth,
      nodeIds: step.nodes.map((n) => n.id),
      voices,
      leadNote: voices[0]?.note || "",
    };

    events.push(event);

    for (const v of voices) {
      const endTime = cursor + v.offset + v.duration + v.release * 0.5;
      if (endTime > maxEndTime) maxEndTime = endTime;
    }

    const patternMul = profile.rhythmPattern[i % profile.rhythmPattern.length];
    const rubato = (hashUnit(seed * 17 + passIndex * 29 + i * 11) - 0.5) * windControl * 0.16;

    const baseSpacing =
      traversal === "bfs"
        ? clamp(beatSec * (1.25 + lengthRatio * 1.45) * patternMul, 0.85, 3.4)
        : clamp(beatSec * (0.24 + lengthRatio * 0.72) * patternMul, 0.16, 1.45);

    cursor += Math.max(0.14, baseSpacing + rubato);
  }

  return {
    events,
    profile,
    rootNote: activeRoot,
    loopDuration: cursor + (traversal === "bfs" ? 0.95 : 0.75),
    totalDuration: Math.max(cursor + 1.4, maxEndTime),
  };
}