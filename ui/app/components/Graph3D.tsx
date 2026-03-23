"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { useMemory } from "../context";
import { getCategoryColor, EDGE_COLORS, type MemoryNode, type MemoryEdge } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GraphNode extends MemoryNode {
  x?: number;
  y?: number;
  z?: number;
  __threeObj?: THREE.Object3D;
}

interface GraphLink extends MemoryEdge {
  __lineObj?: THREE.Object3D;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

function nodeTooltip(node: GraphNode): string {
  const color = getCategoryColor(node.category);
  const status = node.isCurrent ? "" : '<span style="color:#71717a;margin-left:4px">superseded</span>';
  const text = node.content.length > 120 ? node.content.slice(0, 120) + "..." : node.content;
  return `
    <div style="background:rgba(15,15,20,0.95);border:1px solid rgba(100,100,120,0.3);border-radius:10px;padding:10px 14px;max-width:260px;backdrop-filter:blur(12px);font-family:system-ui,-apple-system,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;box-shadow:0 0 6px ${color}"></span>
        <span style="font-size:10px;color:#a1a1aa;text-transform:uppercase;font-weight:600;letter-spacing:0.06em">${node.category}</span>
        ${status}
      </div>
      <p style="font-size:12px;color:#e4e4e7;line-height:1.45;margin:0">${text}</p>
    </div>
  `;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Graph3D() {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    highlightedNodeIds,
    newNodeIds,
  } = useMemory();

  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const bloomAdded = useRef(false);

  // ── Responsive sizing ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Graph data ────────────────────────────────────────────────────────────
  const graphData = useMemo(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ ...e }));
    return {
      nodes: nodes.map((n) => ({ ...n })) as GraphNode[],
      links: links as GraphLink[],
    };
  }, [nodes, edges]);

  // ── Add bloom post-processing + scene enhancements ────────────────────────
  useEffect(() => {
    if (!fgRef.current || bloomAdded.current) return;

    const fg = fgRef.current;

    // Add bloom via postProcessingComposer
    const composer = fg.postProcessingComposer();
    if (composer) {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(dimensions.width, dimensions.height),
        0.8,   // strength
        0.4,   // radius
        0.85   // threshold
      );
      composer.addPass(bloom);
    }
    bloomAdded.current = true;

    // Add subtle fog for depth
    const scene = fg.scene();
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.003);

    // Add ambient light so MeshStandard materials are visible
    const ambient = new THREE.AmbientLight(0x404060, 1.2);
    scene.add(ambient);

    // Add a subtle point light at the camera for specular highlights
    const pointLight = new THREE.PointLight(0x8888ff, 0.6, 500);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Attach point light to camera so it follows
    const camera = fg.camera();
    camera.add(pointLight);
    scene.add(camera);
  }, [dimensions.width, dimensions.height]);

  // ── Initial zoom-to-fit ───────────────────────────────────────────────────
  useEffect(() => {
    if (hasInitialized || nodes.length === 0) return;
    const timer = setTimeout(() => {
      fgRef.current?.zoomToFit(600, 40);
      setHasInitialized(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [nodes, hasInitialized]);

  // ── Node click: select + focus camera ─────────────────────────────────────
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNodeId(node.id);
      if (!fgRef.current || node.x == null) return;
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y ?? 0, node.z ?? 0);
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio },
        { x: node.x, y: node.y ?? 0, z: node.z ?? 0 },
        1000
      );
    },
    [setSelectedNodeId]
  );

  // ── Custom node objects with glow ─────────────────────────────────────────
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      const color = getCategoryColor(node.category);
      const isHighlighted = highlightedNodeIds.has(node.id);
      const isSelected = selectedNodeId === node.id;
      const isNew = newNodeIds.has(node.id);
      const confidence = node.confidence ?? 1;

      // Larger base radii for better visibility
      const baseRadius = node.isCurrent
        ? 1.8 + confidence * 1.0
        : 0.8 + confidence * 0.4;
      const radius = isSelected
        ? baseRadius * 1.5
        : isHighlighted
          ? baseRadius * 1.3
          : isNew
            ? baseRadius * 1.6
            : baseRadius;

      const group = new THREE.Group();

      // Core sphere
      const geometry = new THREE.SphereGeometry(radius, 20, 20);
      const material = new THREE.MeshStandardMaterial({
        color: hexToNum(color),
        emissive: hexToNum(color),
        emissiveIntensity: isSelected ? 1.2 : isHighlighted ? 0.9 : node.isCurrent ? 0.55 : 0.12,
        transparent: true,
        opacity: node.isCurrent ? 0.95 : 0.3,
        roughness: 0.25,
        metalness: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      // Soft outer glow (always on for current nodes, bigger for selected)
      if (node.isCurrent || isSelected || isHighlighted || isNew) {
        const glowScale = isSelected ? 2.2 : isHighlighted ? 1.9 : isNew ? 2.0 : 1.6;
        const glowGeo = new THREE.SphereGeometry(radius * glowScale, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: hexToNum(color),
          transparent: true,
          opacity: isSelected ? 0.18 : isHighlighted ? 0.12 : isNew ? 0.15 : 0.06,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        group.add(glowMesh);
      }

      return group;
    },
    [highlightedNodeIds, selectedNodeId, newNodeIds]
  );

  // ── Zoom to fit handler ───────────────────────────────────────────────────
  const handleZoomToFit = useCallback(() => {
    fgRef.current?.zoomToFit(400, 40);
  }, []);

  // ── Force engine config ───────────────────────────────────────────────────
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force("charge")?.strength(-60);
    fgRef.current.d3Force("link")?.distance(25);
  }, [graphData]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#08080f"
        showNavInfo={false}
        // Nodes
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodeLabel={nodeTooltip}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelectedNodeId(null)}
        // Links
        linkColor={(link: GraphLink) => EDGE_COLORS[link.type] ?? "#6b7280"}
        linkWidth={0.5}
        linkOpacity={0.3}
        linkDirectionalArrowLength={2.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: GraphLink) => EDGE_COLORS[link.type] ?? "#6b7280"}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={0.8}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link: GraphLink) => EDGE_COLORS[link.type] ?? "#6b7280"}
        // Performance
        warmupTicks={100}
        cooldownTicks={200}
      />

      {/* Controls help overlay */}
      <ControlsHelp />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
        <motion.button
          onClick={handleZoomToFit}
          title="Zoom to fit all nodes"
          className="bg-zinc-800/80 hover:bg-zinc-700/90 rounded-lg w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-[background-color,color] duration-150 backdrop-blur-sm"
          style={{
            boxShadow: "0 0 0 1px rgba(63,63,70,0.3), 0 4px 12px rgba(0,0,0,0.3)",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
            <path d="M5 8h6M8 5v6" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

// ─── Controls Help Overlay ──────────────────────────────────────────────────

function ControlsHelp() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 600);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <div className="bg-zinc-900/90 border border-zinc-700/40 rounded-xl px-5 py-3 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-6 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Left drag</kbd>
            <span>Rotate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Right drag</kbd>
            <span>Pan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Scroll / Pinch</kbd>
            <span>Zoom</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Click node</kbd>
            <span>Focus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
