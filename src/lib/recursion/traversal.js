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

function selectChordVoices(levelNodes, maxVoices = 5) {
  if (levelNodes.length <= maxVoices) return levelNodes;

  const sortedByPan = [...levelNodes].sort((a, b) => a.pan - b.pan);
  const picked = [];

  for (let i = 0; i < maxVoices; i += 1) {
    const idx = Math.round((i * (sortedByPan.length - 1)) / (maxVoices - 1));
    picked.push(sortedByPan[idx]);
  }

  return picked;
}

export function buildTraversalSteps(structure, traversalMode = "dfs", startNodeId = null) {
  if (!structure || !structure.rootId) return [];

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

      for (const childId of current.childrenIds) {
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
        voicedNodes: selectChordVoices(levelNodes, 5),
        lengthRatio: avgRatio,
      });
    });

    return steps;
  }

  const ordered = [];
  function dfsWalk(node) {
    ordered.push(node);
    for (const childId of node.childrenIds) {
      const child = structure.nodeMap[childId];
      if (child) dfsWalk(child);
    }
  }

  dfsWalk(startNode);

  return ordered.map((node, index) => ({
    stepIndex: index,
    traversal: "dfs",
    depth: node.depth,
    nodes: [node],
    voicedNodes: [node],
    lengthRatio: node.lengthRatio,
  }));
}