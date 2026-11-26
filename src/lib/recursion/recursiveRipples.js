function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function generateRecursiveRipples(params) {
  const maxDepth = clamp(Math.round(params.depth ?? 5), 1, 6);
  const rippleDecay = clamp(params.rippleDecay ?? 0.56, 0.4, 0.72);
  const spreadRatio = clamp(params.spreadRatio ?? 0.58, 0.35, 0.85);

  const nodes = [];
  const nodeMap = {};
  let orderCounter = 0;

  function buildNode({ id, parentId, depth, branchIndex, angle, normX, normY, radiusRatio }) {
    const node = {
      id,
      parentId,
      childrenIds: [],
      depth,
      maxDepth,
      branchIndex,
      orderIndex: orderCounter++,
      angle,
      normX,
      normY,
      lengthRatio: radiusRatio,
      pan: clamp(normX * 0.85, -0.85, 0.85),
      isLeaf: depth >= maxDepth,
      cx: 0,
      cy: 0,
      radius: 0,
      phaseOffset: orderCounter * 0.45,
    };

    nodes.push(node);
    nodeMap[id] = node;

    if (depth < maxDepth) {
      const childCount = depth === 0 ? 3 : 2;
      const nextRadius = radiusRatio * rippleDecay;
      const orbitDist = radiusRatio * spreadRatio * 1.15;

      for (let i = 0; i < childCount; i += 1) {
        const childId = `${id}-${i}`;
        node.childrenIds.push(childId);

        const childAngle =
          depth === 0
            ? (i * Math.PI * 2) / childCount - Math.PI / 2
            : angle + (i === 0 ? -0.68 : 0.68);

        buildNode({
          id: childId,
          parentId: id,
          depth: depth + 1,
          branchIndex: i,
          angle: childAngle,
          normX: normX + Math.cos(childAngle) * orbitDist,
          normY: normY + Math.sin(childAngle) * orbitDist,
          radiusRatio: nextRadius,
        });
      }
    }
  }

  buildNode({
    id: "0",
    parentId: null,
    depth: 0,
    branchIndex: 0,
    angle: -Math.PI / 2,
    normX: 0,
    normY: 0,
    radiusRatio: 1,
  });

  return {
    mode: "ripples",
    rootId: "0",
    nodes,
    nodeMap,
    maxDepth,
    count: nodes.length,
  };
}

export function computeRipplesLayout(
  structure,
  params,
  viewport,
  time = 0,
  pointer = null,
  layoutOptions = {}
) {
  if (!structure || structure.mode !== "ripples") return;

  const { width, height } = viewport;
  const windSway = clamp(params.windSway ?? 0.35, 0, 1);

  const safeBottomReserve = clamp(layoutOptions.bottomOffset ?? 0, 0, height * 0.36);
  const topPadding = 56;
  const availableHeight = Math.max(220, height - safeBottomReserve - topPadding - 16);
  const baseRadius = Math.min(width, availableHeight) * 0.21;
  const centerX = width * 0.5;
  const centerY = topPadding + availableHeight * 0.5;
  const driftRotation = time * (0.04 + windSway * 0.08);

  for (const node of structure.nodes) {
    const rotatedX =
      node.normX * Math.cos(driftRotation) - node.normY * Math.sin(driftRotation);
    const rotatedY =
      node.normX * Math.sin(driftRotation) + node.normY * Math.cos(driftRotation);

    let cx = centerX + rotatedX * baseRadius * 1.32;
    let cy = centerY + rotatedY * baseRadius * 1.32;
    let radius =
      baseRadius *
      node.lengthRatio *
      (1 + Math.sin(time * 1.15 + node.phaseOffset) * (0.025 + windSway * 0.03));

    if (pointer && pointer.active) {
      const dx = cx - pointer.x;
      const dy = cy - pointer.y;
      const dist = Math.hypot(dx, dy);
      const influenceRadius = Math.min(width, height) * 0.3;

      if (dist < influenceRadius && dist > 1) {
        const falloff = 1 - dist / influenceRadius;
        cx += (dx / dist) * falloff * 14;
        cy += (dy / dist) * falloff * 14;
        radius *= 1 + falloff * 0.08;
      }
    }

    node.cx = cx;
    node.cy = cy;
    node.radius = Math.max(6, radius);
  }
}

export function findRippleHitNode(structure, x, y, ringTolerance = 14) {
  if (!structure || structure.mode !== "ripples") return null;

  let closestNode = null;
  let closestScore = Infinity;

  for (let i = structure.nodes.length - 1; i >= 0; i -= 1) {
    const node = structure.nodes[i];
    const distFromCenter = Math.hypot(x - node.cx, y - node.cy);
    const edgeDist = Math.abs(distFromCenter - node.radius);
    const insideSmallCircle = distFromCenter <= node.radius && node.radius <= 24;

    if (edgeDist <= ringTolerance || insideSmallCircle) {
      const score = insideSmallCircle ? distFromCenter * 0.5 : edgeDist;
      if (score < closestScore) {
        closestScore = score;
        closestNode = node;
      }
    }
  }

  return closestNode;
}