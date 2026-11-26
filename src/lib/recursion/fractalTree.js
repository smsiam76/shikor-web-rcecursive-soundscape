const DEG_TO_RAD = Math.PI / 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function generateFractalTree(params) {
  const maxDepth = clamp(Math.round(params.depth ?? 6), 1, 8);
  const branchAngleRad = clamp(params.branchAngle ?? 26, 8, 60) * DEG_TO_RAD;
  const lengthDecay = clamp(params.lengthDecay ?? 0.74, 0.52, 0.84);

  const nodes = [];
  const nodeMap = {};
  let orderCounter = 0;

  function buildNode({ id, parentId, depth, branchIndex, relativeAngle, cumulativeOffset, lengthRatio }) {
    const node = {
      id,
      parentId,
      childrenIds: [],
      depth,
      maxDepth,
      branchIndex,
      orderIndex: orderCounter++,
      relativeAngle,
      lengthRatio,
      pan: clamp(cumulativeOffset * 0.85, -0.85, 0.85),
      isLeaf: depth >= maxDepth,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      angle: -Math.PI / 2,
      length: 0,
      thickness: 1,
    };

    nodes.push(node);
    nodeMap[id] = node;

    if (depth < maxDepth) {
      const nextRatio = lengthRatio * lengthDecay;
      const spreadStep = 1 / Math.max(1, maxDepth);

      const leftId = `${id}-0`;
      const rightId = `${id}-1`;
      node.childrenIds.push(leftId, rightId);

      buildNode({
        id: leftId,
        parentId: id,
        depth: depth + 1,
        branchIndex: 0,
        relativeAngle: -branchAngleRad,
        cumulativeOffset: cumulativeOffset - spreadStep,
        lengthRatio: nextRatio,
      });

      buildNode({
        id: rightId,
        parentId: id,
        depth: depth + 1,
        branchIndex: 1,
        relativeAngle: branchAngleRad,
        cumulativeOffset: cumulativeOffset + spreadStep,
        lengthRatio: nextRatio,
      });
    }
  }

  buildNode({
    id: "0",
    parentId: null,
    depth: 0,
    branchIndex: 0,
    relativeAngle: 0,
    cumulativeOffset: 0,
    lengthRatio: 1,
  });

  return {
    mode: "tree",
    rootId: "0",
    nodes,
    nodeMap,
    maxDepth,
    count: nodes.length,
  };
}

export function computeTreeLayout(
  structure,
  params,
  viewport,
  time = 0,
  pointer = null,
  layoutOptions = {}
) {
  if (!structure || structure.mode !== "tree") return;

  const { width, height } = viewport;
  const windSway = clamp(params.windSway ?? 0.4, 0, 1);
  const decay = clamp(params.lengthDecay ?? 0.74, 0.52, 0.84);

  const safeBottomReserve = clamp(layoutOptions.bottomOffset ?? 0, 0, height * 0.36);
  const topPadding = 68;
  const rootY = height - Math.max(height * 0.08, safeBottomReserve + 22);
  const availableHeight = Math.max(200, rootY - topPadding);

  const usableHeight = Math.min(availableHeight * 0.9, width * 0.66);
  const geometricSum = (1 - Math.pow(decay, structure.maxDepth + 1)) / Math.max(0.15, 1 - decay);
  const baseLength = clamp((usableHeight / geometricSum) * 0.94, 34, availableHeight * 0.32);
  const baseThickness = clamp(baseLength * 0.14, 4.5, 15);

  const rootX = width * 0.5;

  for (const node of structure.nodes) {
    const parent = node.parentId ? structure.nodeMap[node.parentId] : null;
    const startX = parent ? parent.x2 : rootX;
    const startY = parent ? parent.y2 : rootY;
    const baseAngle = parent ? parent.angle + node.relativeAngle : -Math.PI / 2;

    const depthFactor = (node.depth + 0.4) / (structure.maxDepth + 1);
    const swayWave =
      Math.sin(time * 0.9 + node.depth * 0.55 + node.orderIndex * 0.08) *
      windSway *
      0.085 *
      depthFactor;

    let hoverPush = 0;
    if (pointer && pointer.active) {
      const dx = startX - pointer.x;
      const dy = startY - pointer.y;
      const dist = Math.hypot(dx, dy);
      const influenceRadius = Math.min(width, height) * 0.28;

      if (dist < influenceRadius && dist > 1) {
        const falloff = 1 - dist / influenceRadius;
        const directional = (dx / influenceRadius) * 0.22 + (pointer.vx || 0) * 0.004;
        hoverPush = clamp(directional * falloff * (0.4 + depthFactor), -0.22, 0.22);
      }
    }

    const angle = baseAngle + swayWave + hoverPush;
    const length = baseLength * node.lengthRatio;
    const x2 = startX + Math.cos(angle) * length;
    const y2 = startY + Math.sin(angle) * length;

    node.x1 = startX;
    node.y1 = startY;
    node.x2 = x2;
    node.y2 = y2;
    node.angle = angle;
    node.length = length;
    node.thickness = Math.max(1.1, baseThickness * Math.pow(node.lengthRatio, 1.15));
  }
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function findTreeHitNode(structure, x, y, hitPadding = 12) {
  if (!structure || structure.mode !== "tree") return null;

  let closestNode = null;
  let closestDist = Infinity;

  for (let i = structure.nodes.length - 1; i >= 0; i -= 1) {
    const node = structure.nodes[i];
    const dist = pointToSegmentDistance(x, y, node.x1, node.y1, node.x2, node.y2);
    const threshold = Math.max(hitPadding, node.thickness * 0.8 + 6);

    if (dist <= threshold && dist < closestDist) {
      closestDist = dist;
      closestNode = node;
    }
  }

  return closestNode;
}