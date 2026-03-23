"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemory } from "../context";
import { getCategoryColor, EDGE_COLORS } from "../types";

function SimilarityBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="h-[3px] bg-zinc-800/60 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ type: "spring", duration: 0.6, bounce: 0 }}
        style={{ backgroundColor: color, opacity: 0.6 }}
      />
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-0.5">
        {label}
      </div>
      <div className="text-[12px] text-zinc-300">{children}</div>
    </div>
  );
}

export default function RightSidebar() {
  const {
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    edges,
    highlightedNodeIds,
    setHighlightedNodeIds,
    searchResults,
    setSearchResults,
  } = useMemory();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [entityHistory, setEntityHistory] = useState<
    Array<{ version?: number; content: string; date?: string }> | null
  >(null);
  const [entityProfile, setEntityProfile] = useState<{
    static_facts?: Record<string, unknown>;
    dynamic_facts?: Record<string, unknown>;
  } | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeRelations = edges.filter(
    (e) => e.source === selectedNodeId || e.target === selectedNodeId
  );

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 10 }),
      });
      const data = await res.json();
      const results = data.results ?? data;
      setSearchResults(results);
      setHighlightedNodeIds(
        new Set(results.map((r: { id: string }) => r.id))
      );
    } catch (e) {
      console.error("Search failed:", e);
    }
    setSearching(false);
  };

  const clearSearch = () => {
    setSearchResults([]);
    setHighlightedNodeIds(new Set());
    setQuery("");
  };

  useEffect(() => {
    if (!selectedNode) {
      setEntityHistory(null);
      setEntityProfile(null);
      return;
    }
    const words = selectedNode.content.split(/\s+/);
    const name =
      words.find((w) => /^[A-Z]/.test(w) && w.length > 1) ?? words[0];
    if (!name) return;

    Promise.allSettled([
      fetch(`/api/history/${encodeURIComponent(name)}`).then((r) => r.json()),
      fetch(`/api/profile/${encodeURIComponent(name)}`).then((r) => r.json()),
    ]).then(([historyResult, profileResult]) => {
      if (historyResult.status === "fulfilled") {
        const h = historyResult.value;
        setEntityHistory(h?.versions ?? (Array.isArray(h) ? h : null));
      } else {
        setEntityHistory(null);
      }
      if (profileResult.status === "fulfilled") {
        setEntityProfile(profileResult.value);
      } else {
        setEntityProfile(null);
      }
    });
  }, [selectedNode]);

  return (
    <div
      className="w-[360px] shrink-0 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(24,24,27,0.85) 0%, rgba(24,24,27,0.65) 100%)",
        boxShadow:
          "-1px 0 0 rgba(63,63,70,0.2), -4px 0 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Search */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ boxShadow: "0 1px 0 rgba(63,63,70,0.15)" }}
      >
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
          Search
        </h2>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="w-full bg-zinc-800/60 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus-ring placeholder:text-zinc-600 transition-shadow duration-200"
              style={{
                boxShadow:
                  "inset 0 1px 2px rgba(0,0,0,0.15), 0 0 0 1px rgba(63,63,70,0.25)",
              }}
              placeholder="Semantic search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <motion.button
            className="px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg text-sm transition-colors duration-150 disabled:opacity-40"
            style={{
              boxShadow:
                "0 0 0 1px rgba(63,63,70,0.25), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
            onClick={handleSearch}
            disabled={searching}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            {searching ? (
              <span className="w-3.5 h-3.5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin inline-block" />
            ) : (
              "Go"
            )}
          </motion.button>
        </div>

        {/* Search Results */}
        <AnimatePresence initial={false}>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="mt-3 space-y-2 max-h-64 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {searchResults.length} results
                </span>
                <motion.button
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors duration-150 min-h-[28px] min-w-[40px] flex items-center justify-end"
                  onClick={clearSearch}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                >
                  Clear
                </motion.button>
              </div>
              {searchResults.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    duration: 0.35,
                    bounce: 0,
                    delay: i * 0.05,
                  }}
                  onClick={() => setSelectedNodeId(r.id)}
                  className="w-full text-left rounded-[10px] p-3 hover:bg-zinc-800/30 transition-colors duration-150"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(63,63,70,0.12), 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.015)",
                    background: "rgba(39,39,42,0.2)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(r.category),
                          boxShadow: `0 0 4px ${getCategoryColor(r.category)}40`,
                        }}
                      />
                      <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wide">
                        {r.category}
                      </span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(r.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-[1.6] mb-2">
                    {r.content}
                  </p>
                  <SimilarityBar
                    value={r.similarity}
                    color={getCategoryColor(r.category)}
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {selectedNode ? (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              {/* Detail Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Memory Detail
                </h2>
                <motion.button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors duration-150 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800/50"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <div className="space-y-4">
                {/* Content Card */}
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(63,63,70,0.12), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.02)",
                    background: "rgba(39,39,42,0.25)",
                  }}
                >
                  <p className="text-[13px] text-zinc-200 leading-[1.65]">
                    {selectedNode.content}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <MetaField label="Category">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(
                            selectedNode.category
                          ),
                          boxShadow: `0 0 6px ${getCategoryColor(selectedNode.category)}30`,
                        }}
                      />
                      <span className="capitalize">
                        {selectedNode.category}
                      </span>
                    </div>
                  </MetaField>

                  <MetaField label="Version">
                    <span className="font-mono">v{selectedNode.version}</span>
                  </MetaField>

                  <MetaField label="Confidence">
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-[3px] bg-zinc-800/60 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500/60 rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(selectedNode.confidence ?? 1) * 100}%`,
                          }}
                          transition={{
                            type: "spring",
                            duration: 0.6,
                            bounce: 0,
                          }}
                        />
                      </div>
                      <span className="font-mono text-zinc-400 text-[10px]">
                        {((selectedNode.confidence ?? 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </MetaField>

                  <MetaField label="Status">
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        selectedNode.isCurrent
                          ? "text-emerald-400"
                          : "text-zinc-500"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedNode.isCurrent
                            ? "bg-emerald-400"
                            : "bg-zinc-600"
                        }`}
                        style={
                          selectedNode.isCurrent
                            ? {
                                boxShadow:
                                  "0 0 4px rgba(52,211,153,0.4)",
                              }
                            : undefined
                        }
                      />
                      {selectedNode.isCurrent ? "Current" : "Superseded"}
                    </span>
                  </MetaField>
                </div>

                {/* Dates */}
                {(selectedNode.documentDate || selectedNode.eventDate) && (
                  <div
                    className="rounded-lg px-3 py-2.5 space-y-1"
                    style={{
                      background: "rgba(39,39,42,0.2)",
                      boxShadow: "0 0 0 1px rgba(63,63,70,0.1)",
                    }}
                  >
                    {selectedNode.documentDate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Document</span>
                        <span className="font-mono text-zinc-400">
                          {selectedNode.documentDate}
                        </span>
                      </div>
                    )}
                    {selectedNode.eventDate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Event</span>
                        <span className="font-mono text-zinc-400">
                          {selectedNode.eventDate}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.session && (
                  <div className="text-[10px] text-zinc-600 font-mono truncate px-0.5">
                    Session: {selectedNode.session}
                  </div>
                )}

                {/* Relations */}
                {nodeRelations.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
                      Relations
                      <span className="text-zinc-600 ml-1 font-mono normal-case">
                        {nodeRelations.length}
                      </span>
                    </h3>
                    <div className="space-y-1.5">
                      {nodeRelations.map((rel, i) => {
                        const edgeColor =
                          EDGE_COLORS[rel.type] ?? EDGE_COLORS.updates;
                        return (
                          <motion.button
                            key={i}
                            onClick={() => {
                              const otherId =
                                rel.source === selectedNodeId
                                  ? rel.target
                                  : rel.source;
                              setSelectedNodeId(otherId);
                            }}
                            className="w-full text-left flex items-start gap-2.5 text-xs hover:bg-zinc-800/40 rounded-lg px-3 py-2.5 transition-colors duration-150 min-h-[36px]"
                            style={{
                              boxShadow:
                                "0 0 0 1px rgba(63,63,70,0.1), inset 0 1px 0 rgba(255,255,255,0.01)",
                              background: "rgba(39,39,42,0.12)",
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{
                              type: "spring",
                              duration: 0.3,
                              bounce: 0,
                            }}
                          >
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase shrink-0 mt-0.5"
                              style={{
                                backgroundColor: edgeColor + "18",
                                color: edgeColor,
                                boxShadow: `0 0 0 1px ${edgeColor}12`,
                              }}
                            >
                              {rel.type}
                            </span>
                            <span className="text-zinc-400 leading-relaxed">
                              {rel.source === selectedNodeId
                                ? rel.targetContent
                                : rel.sourceContent}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Version History */}
                {entityHistory &&
                  Array.isArray(entityHistory) &&
                  entityHistory.length > 1 && (
                    <div>
                      <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
                        Version History
                      </h3>
                      <div className="relative pl-4 space-y-3">
                        {/* Timeline line */}
                        <div
                          className="absolute left-[5px] top-1 bottom-1 w-px"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(63,63,70,0.4) 0%, rgba(63,63,70,0.1) 100%)",
                          }}
                        />
                        {entityHistory.map((v, i) => (
                          <div key={i} className="relative">
                            <div
                              className="absolute -left-[13px] top-[5px] w-[7px] h-[7px] rounded-full"
                              style={{
                                background:
                                  i === 0
                                    ? "rgba(59,130,246,0.8)"
                                    : "rgba(63,63,70,0.6)",
                                boxShadow:
                                  i === 0
                                    ? "0 0 0 2px rgba(59,130,246,0.2), 0 0 6px rgba(59,130,246,0.2)"
                                    : "0 0 0 2px rgba(39,39,42,0.8)",
                              }}
                            />
                            <div className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-zinc-500">
                                  v{v.version ?? i + 1}
                                </span>
                                {v.date && (
                                  <span className="text-zinc-600 text-[10px]">
                                    {v.date}
                                  </span>
                                )}
                              </div>
                              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                                {v.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Entity Profile */}
                {entityProfile &&
                  (entityProfile.static_facts ||
                    entityProfile.dynamic_facts) && (
                    <div>
                      <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
                        Entity Profile
                      </h3>
                      <div
                        className="rounded-xl p-3.5 text-xs space-y-3"
                        style={{
                          boxShadow:
                            "0 0 0 1px rgba(63,63,70,0.12), 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.015)",
                          background: "rgba(39,39,42,0.2)",
                        }}
                      >
                        {entityProfile.static_facts &&
                          Object.keys(entityProfile.static_facts).length >
                            0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                Static
                              </span>
                              <pre className="text-zinc-400 mt-1.5 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                {JSON.stringify(
                                  entityProfile.static_facts,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                        {entityProfile.dynamic_facts &&
                          Object.keys(entityProfile.dynamic_facts).length >
                            0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                Dynamic
                              </span>
                              <pre className="text-zinc-400 mt-1.5 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                {JSON.stringify(
                                  entityProfile.dynamic_facts,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(39,39,42,0.3)",
                  boxShadow:
                    "0 0 0 1px rgba(63,63,70,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-zinc-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    d="M12 16v-4M12 8h.01"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-xs text-zinc-600">
                Select a node to view details
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
