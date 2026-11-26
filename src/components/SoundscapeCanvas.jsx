"use client";

import { useEffect, useRef } from "react";
import { computeTreeLayout, findTreeHitNode } from "@/lib/recursion/fractalTree";
import { computeRipplesLayout, findRippleHitNode } from "@/lib/recursion/recursiveRipples";

const PALETTE_KEYS = [
  "bgTop",
  "bgBottom",
  "trunk",
  "branchMid",
  "leaf",
  "leafTip",
  "activeGlow",
  "particle",
  "rippleBase",
  "rippleInner",
];

function hexToRgb(hex) {
  const clean = (hex || "#ffffff").replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function paletteToRgb(palette) {
  const mapped = {};
  for (const key of PALETTE_KEYS) {
    mapped[key] = hexToRgb(palette[key]);
  }
  return mapped;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgbString(rgb, alpha = 1) {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
}

export default function SoundscapeCanvas({
  structure,
  params,
  palette,
  selectedSubtreeIds,
  pulseEvent,
  onNodeClick,
}) {
  const canvasRef = useRef(null);
  const structureRef = useRef(structure);
  const paramsRef = useRef(params);
  const selectedRef = useRef(selectedSubtreeIds);
  const targetPaletteRef = useRef(paletteToRgb(palette));
  const currentPaletteRef = useRef(paletteToRgb(palette));

  const pointerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false });
  const glowMapRef = useRef(new Map());
  const particlesRef = useRef([]);
  const viewportRef = useRef({ width: 1, height: 1 });

  useEffect(() => {
    structureRef.current = structure;
  }, [structure]);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    selectedRef.current = selectedSubtreeIds;
  }, [selectedSubtreeIds]);

  useEffect(() => {
    targetPaletteRef.current = paletteToRgb(palette);
  }, [palette]);

  useEffect(() => {
    if (!pulseEvent || !pulseEvent.ids || pulseEvent.ids.length === 0) return;

    const now = performance.now();
    const currentStructure = structureRef.current;

    for (const id of pulseEvent.ids) {
      glowMapRef.current.set(id, now);

      const node = currentStructure?.nodeMap?.[id];
      if (node && node.isLeaf && particlesRef.current.length < 75) {
        spawnParticle(node, currentStructure.mode, true);
      }
    }
  }, [pulseEvent]);

  function spawnParticle(node, mode, boosted = false) {
    const isTree = mode === "tree";
    const x = isTree ? node.x2 : node.cx + Math.cos(Math.random() * Math.PI * 2) * node.radius;
    const y = isTree ? node.y2 : node.cy + Math.sin(Math.random() * Math.PI * 2) * node.radius;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    particlesRef.current.push({
      x,
      y,
      vx: isTree ? (Math.random() - 0.35) * 0.45 : (Math.random() - 0.5) * 0.35,
      vy: isTree ? 0.35 + Math.random() * 0.55 : -0.25 - Math.random() * 0.35,
      size: boosted ? 2.6 + Math.random() * 2.2 : 1.8 + Math.random() * 1.8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      life: 0,
      maxLife: 180 + Math.random() * 140,
      isPetal: isTree,
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let frameId = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      viewportRef.current = { width, height };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function stepPalette() {
      const curr = currentPaletteRef.current;
      const target = targetPaletteRef.current;
      for (const key of PALETTE_KEYS) {
        curr[key] = lerpRgb(curr[key], target[key], 0.06);
      }
      return curr;
    }

    function getNodeGlow(nodeId, now) {
      const stamped = glowMapRef.current.get(nodeId);
      if (!stamped) return 0;
      const elapsed = now - stamped;
      const duration = 950;
      if (elapsed >= duration) {
        glowMapRef.current.delete(nodeId);
        return 0;
      }
      const progress = elapsed / duration;
      return Math.pow(1 - progress, 1.65);
    }

    function drawBackground(pal, width, height) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, rgbString(pal.bgTop, 1));
      grad.addColorStop(1, rgbString(pal.bgBottom, 1));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const radial = ctx.createRadialGradient(
        width * 0.5,
        height * 0.52,
        10,
        width * 0.5,
        height * 0.52,
        Math.max(width, height) * 0.55
      );
      radial.addColorStop(0, rgbString(pal.leaf, 0.055));
      radial.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }

    function drawTree(struct, pal, now) {
      const selected = selectedRef.current;
      const hasSelection = selected && selected.size > 0;
      const maxDepth = Math.max(1, struct.maxDepth);

      ctx.lineCap = "round";

      for (const node of struct.nodes) {
        const depthT = node.depth / maxDepth;
        const glow = getNodeGlow(node.id, now);
        const isSelected = !hasSelection || selected.has(node.id);
        const alpha = isSelected ? 0.94 : 0.22;

        let baseRgb;
        if (depthT < 0.62) {
          baseRgb = lerpRgb(pal.trunk, pal.branchMid, depthT / 0.62);
        } else if (depthT < 0.86) {
          baseRgb = lerpRgb(pal.branchMid, pal.leaf, (depthT - 0.62) / 0.24);
        } else {
          baseRgb = lerpRgb(pal.leaf, pal.leafTip, (depthT - 0.86) / 0.14);
        }

        const drawRgb = glow > 0 ? lerpRgb(baseRgb, pal.activeGlow, glow * 0.82) : baseRgb;

        if (glow > 0.04) {
          ctx.beginPath();
          ctx.moveTo(node.x1, node.y1);
          ctx.lineTo(node.x2, node.y2);
          ctx.strokeStyle = rgbString(pal.activeGlow, glow * 0.42 * (isSelected ? 1 : 0.4));
          ctx.lineWidth = node.thickness + 4 + glow * 6;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        ctx.strokeStyle = rgbString(drawRgb, alpha);
        ctx.lineWidth = node.thickness + glow * 1.4;
        ctx.stroke();

        if (node.thickness > 3.2 && isSelected) {
          ctx.beginPath();
          ctx.moveTo(node.x1, node.y1);
          ctx.lineTo(node.x2, node.y2);
          ctx.strokeStyle = rgbString(lerpRgb(drawRgb, [255, 255, 255], 0.22), 0.18);
          ctx.lineWidth = Math.max(0.8, node.thickness * 0.28);
          ctx.stroke();
        }

        if (node.isLeaf && isSelected) {
          const tipRadius = 1.6 + glow * 2.8;
          ctx.beginPath();
          ctx.arc(node.x2, node.y2, tipRadius, 0, Math.PI * 2);
          ctx.fillStyle = rgbString(
            glow > 0 ? pal.activeGlow : pal.leafTip,
            0.55 + glow * 0.45
          );
          ctx.fill();
        }
      }
    }

    function drawRipples(struct, pal, now) {
      const selected = selectedRef.current;
      const hasSelection = selected && selected.size > 0;
      const maxDepth = Math.max(1, struct.maxDepth);

      for (const node of struct.nodes) {
        if (!node.parentId) continue;
        const parent = struct.nodeMap[node.parentId];
        if (!parent) continue;
        const isSelected = !hasSelection || selected.has(node.id);
        ctx.beginPath();
        ctx.moveTo(parent.cx, parent.cy);
        ctx.lineTo(node.cx, node.cy);
        ctx.strokeStyle = rgbString(pal.rippleBase, isSelected ? 0.1 : 0.03);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const node of struct.nodes) {
        const depthT = node.depth / maxDepth;
        const glow = getNodeGlow(node.id, now);
        const isSelected = !hasSelection || selected.has(node.id);
        const baseRgb = lerpRgb(pal.rippleBase, pal.rippleInner, depthT);
        const strokeRgb = glow > 0 ? lerpRgb(baseRgb, pal.activeGlow, glow * 0.85) : baseRgb;
        const alphaScale = isSelected ? 1 : 0.2;

        ctx.beginPath();
        ctx.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = rgbString(strokeRgb, (0.04 + glow * 0.12) * alphaScale);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rgbString(strokeRgb, (0.34 + depthT * 0.32 + glow * 0.34) * alphaScale);
        ctx.lineWidth = Math.max(1, 2.2 - depthT * 0.9 + glow * 1.6);
        ctx.stroke();

        if (glow > 0.03) {
          const echoRadius = node.radius + (1 - glow) * (18 + node.radius * 0.18);
          ctx.beginPath();
          ctx.arc(node.cx, node.cy, echoRadius, 0, Math.PI * 2);
          ctx.strokeStyle = rgbString(pal.activeGlow, glow * 0.45 * alphaScale);
          ctx.lineWidth = 1.2 + glow * 1.4;
          ctx.stroke();
        }
      }
    }

    function updateAndDrawParticles(struct, pal, windSway) {
      if (struct && particlesRef.current.length < 48 && Math.random() < 0.04 + windSway * 0.05) {
        const leaves = struct.nodes.filter((n) => n.isLeaf);
        if (leaves.length > 0) {
          const picked = leaves[Math.floor(Math.random() * leaves.length)];
          spawnParticle(picked, struct.mode, false);
        }
      }

      const nextParticles = [];
      for (const p of particlesRef.current) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;

        const lifeT = p.life / p.maxLife;
        const fade = lifeT < 0.15 ? lifeT / 0.15 : 1 - (lifeT - 0.15) / 0.85;

        if (p.isPetal) {
          p.x += p.vx + Math.sin(p.life * 0.04 + p.rotation) * (0.25 + windSway * 0.45);
          p.y += p.vy;
          p.rotation += p.rotationSpeed;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = rgbString(pal.particle, fade * 0.65);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.25, p.size * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          p.x += p.vx + Math.sin(p.life * 0.03) * 0.15;
          p.y += p.vy;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = rgbString(pal.particle, fade * 0.55);
          ctx.fill();
        }

        nextParticles.push(p);
      }

      particlesRef.current = nextParticles;
    }

    function render(now) {
      const time = now * 0.001;
      const { width, height } = viewportRef.current;
      const struct = structureRef.current;
      const currentParams = paramsRef.current;
      const pal = stepPalette();

      pointerRef.current.vx *= 0.88;
      pointerRef.current.vy *= 0.88;

      drawBackground(pal, width, height);

      if (struct) {
        if (struct.mode === "tree") {
          computeTreeLayout(struct, currentParams, viewportRef.current, time, pointerRef.current);
          drawTree(struct, pal, now);
        } else {
          computeRipplesLayout(struct, currentParams, viewportRef.current, time, pointerRef.current);
          drawRipples(struct, pal, now);
        }

        updateAndDrawParticles(struct, pal, currentParams.windSway ?? 0.4);
      }

      frameId = requestAnimationFrame(render);
    }

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function getCanvasCoords(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerMove(event) {
    const { x, y } = getCanvasCoords(event);
    const prev = pointerRef.current;
    pointerRef.current = {
      x,
      y,
      vx: prev.active ? x - prev.x : 0,
      vy: prev.active ? y - prev.y : 0,
      active: true,
    };
  }

  function handlePointerLeave() {
    pointerRef.current.active = false;
  }

  function handleClick(event) {
    const struct = structureRef.current;
    if (!struct || !onNodeClick) return;

    const { x, y } = getCanvasCoords(event);
    const hitNode =
      struct.mode === "tree"
        ? findTreeHitNode(struct, x, y)
        : findRippleHitNode(struct, x, y);

    onNodeClick(hitNode || null);
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      aria-label="Interactive recursive soundscape canvas"
      className="fixed inset-0 block h-full w-full cursor-pointer touch-none"
    />
  );
}