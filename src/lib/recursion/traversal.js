export function getSubtreeIds(structure, startNodeId) {
  const result = new Set();
  if (!structure || !startNodeId || !structure.nodeMap[startNodeId]) {
    return result;
  }

  const stack = [startNodeId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (result.has(currentId)) continue;
    result.add(currentId);

    const node = structure.nodeMap[currentId];
    if (node && node.childrenIds) {
      for (let i = node.childrenIds.length - 1; i >= 0; i -= 1) {
        stack.push(node.childrenIds[i]);
      }
    }
  }

  return result;
}

function getZoneIndex(nodeId) {
  const parts = String(nodeId).split("-");
  if (parts.length <= 1) return 0;
  const first = Number(parts[1]) || 0;
  const second = parts.length > 2 ? Number(parts[2]) || 0 : 0;
  return (first * 2 + second) % 4;
}

function getLeftToRightChildren(structure, childrenIds) {
  if (!childrenIds || childrenIds.length <= 1) return childrenIds || [];
  if (structure.mode === "tree") {
    return childrenIds;
  }

  return [...childrenIds].sort((aId, bId) => {
    const a = structure.nodeMap[aId];
    const b = structure.nodeMap[bId];
    if (!a || !b) return 0;
    if (a.pan !== b.pan) return a.pan - b.pan;
    return (a.branchIndex || 0) - (b.branchIndex || 0);
  });
}

function selectChordVoices(levelNodes, maxVoices = 5, strumOrder = "left-to-right") {
  const sortedByPan = [...levelNodes].sort((a, b) => a.pan - b.pan);
  let picked = sortedByPan;

  if (sortedByPan.length > maxVoices) {
    picked = [];
    for (let i = 0; i < maxVoices; i += 1) {
      const idx = Math.round((i * (sortedByPan.length - 1)) / (maxVoices - 1));
      picked.push(sortedByPan[idx]);
    }
  }

  if (strumOrder === "right-to-left") {
    return [...picked].reverse();
  }
  if (strumOrder === "center-out") {
    return [...picked].sort((a, b) => Math.abs(a.pan) - Math.abs(b.pan));
  }
  return picked;
}

export function buildTraversalSteps(
  structure,
  traversalMode = "dfs",
  startNodeId = null,
  options = {}
) {
  if (!structure || !structure.rootId) return [];

  const { strumOrder = "left-to-right" } = options;
  const rootId = startNodeId && structure.nodeMap[startNodeId] ? startNodeId : structure.rootId;
  const startNode = structure.nodeMap[rootId];
  if (!startNode) return [];

  if (traversalMode === "bfs") {
    const levelBuckets = new Map();
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift();
      const relativeDepth = current.depth - startNode.depth;

      if (!levelBuckets.has(relativeDepth)) {
        levelBuckets.set(relativeDepth, []);
      }
      levelBuckets.get(relativeDepth).push(current);

      const orderedChildren = getLeftToRightChildren(structure, current.childrenIds);
      for (const childId of orderedChildren) {
        const child = structure.nodeMap[childId];
        if (child) queue.push(child);
      }
    }

    const steps = [];
    const sortedDepths = [...levelBuckets.keys()].sort((a, b) => a - b);

    sortedDepths.forEach((relDepth, index) => {
      const levelNodes = levelBuckets.get(relDepth);
      const avgRatio =
        levelNodes.reduce((sum, item) => sum + item.lengthRatio, 0) / levelNodes.length;

      steps.push({
        stepIndex: index,
        traversal: "bfs",
        depth: levelNodes[0].depth,
        nodes: levelNodes,
        voicedNodes: selectChordVoices(levelNodes, 5, strumOrder),
        lengthRatio: avgRatio,
        backtrackJump: 0,
        zoneIndex: index % 4,
      });
    });

    return steps;
  }

  const ordered = [];
  function dfsWalk(node) {
    ordered.push(node);
    const orderedChildren = getLeftToRightChildren(structure, node.childrenIds);
    for (const childId of orderedChildren) {
      const child = structure.nodeMap[childId];
      if (child) dfsWalk(child);
    }
  }

  dfsWalk(startNode);

  let prevDepth = startNode.depth;
  return ordered.map((node, index) => {
    const backtrackJump = index === 0 ? 0 : Math.max(0, prevDepth - node.depth);
    prevDepth = node.depth;

    return {
      stepIndex: index,
      traversal: "dfs",
      depth: node.depth,
      nodes: [node],
      voicedNodes: [node],
      lengthRatio: node.lengthRatio,
      backtrackJump,
      zoneIndex: getZoneIndex(node.id),
    };
  });
}