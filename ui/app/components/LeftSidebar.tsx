"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemory } from "../context";
import { getCategoryColor } from "../types";

function StatCard({
  label,
  value,
  color = "text-zinc-200",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(39,39,42,0.3)",
        boxShadow:
          "0 0 0 1px rgba(63,63,70,0.15), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
        {label}
      </div>
      <div className={`text-lg font-mono font-semibold ${color} mt-0.5 leading-none`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export default function LeftSidebar() {
  const {
    refreshGraph,
    stats,
    entities,
    ingestFeed,
    addToFeed,
    setSelectedNodeId,
  } = useMemory();
  const [text, setText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  const handleIngest = async () => {
    if (!text.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const memories: Array<{
        id?: string;
        content: string;
        category: string;
      }> = data.memories ?? data.extracted ?? [];
      if (memories.length > 0) {
        addToFeed(
          memories.map((m) => ({
            id: m.id ?? crypto.randomUUID(),
            content: m.content,
            category: m.category,
            timestamp: new Date().toISOString(),
          }))
        );
      }
      setText("");
      await refreshGraph();
    } catch (e) {
      console.error("Ingest failed:", e);
    }
    setIngesting(false);
  };

  return (
    <div
      className="w-80 shrink-0 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(24,24,27,0.85) 0%, rgba(24,24,27,0.65) 100%)",
        boxShadow:
          "1px 0 0 rgba(63,63,70,0.2), 4px 0 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-2 h-2 rounded-full bg-blue-500"
            style={{
              boxShadow:
                "0 0 6px rgba(59,130,246,0.6), 0 0 12px rgba(59,130,246,0.2)",
              animation: "pulse-glow 3s ease-in-out infinite",
            }}
          />
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-100">
            Memory Engine
          </h1>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 ml-[18px]">
          Visualize AI agent memory in motion
        </p>
      </div>

      {/* Ingest */}
      <div
        className="px-5 pb-4"
        style={{
          boxShadow: "0 1px 0 rgba(63,63,70,0.15)",
        }}
      >
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
          Ingest
        </h2>
        <textarea
          className="w-full bg-zinc-800/60 rounded-lg p-3 text-sm leading-relaxed resize-none focus:outline-none focus-ring placeholder:text-zinc-600 transition-shadow duration-200"
          style={{
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.15), 0 0 0 1px rgba(63,63,70,0.25)",
          }}
          rows={3}
          placeholder="Paste text to extract memories…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) handleIngest();
          }}
        />
        <div className="flex items-center gap-2 mt-2">
          <motion.button
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-sm font-medium py-2 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
            onClick={handleIngest}
            disabled={ingesting || !text.trim()}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            {ingesting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Extracting…
              </span>
            ) : (
              "Ingest"
            )}
          </motion.button>
          <span className="text-[10px] text-zinc-600 shrink-0">
            ⌘↵
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
          Recent Extractions
        </h2>
        {ingestFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-zinc-700 mb-2"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-xs">No memories extracted yet</span>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {ingestFeed.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{
                    type: "spring",
                    duration: 0.35,
                    bounce: 0,
                    delay: i < 5 ? i * 0.06 : 0,
                  }}
                  className="rounded-[10px] p-3 group"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(63,63,70,0.12), 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.015)",
                    background: "rgba(39,39,42,0.2)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(item.category),
                        boxShadow: `0 0 4px ${getCategoryColor(item.category)}40`,
                      }}
                    />
                    <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wide">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-[1.6]">
                    {item.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Entities */}
      {entities.length > 0 && (
        <div
          className="px-5 py-3.5 max-h-36 overflow-y-auto"
          style={{
            boxShadow:
              "0 -1px 0 rgba(63,63,70,0.15), 0 -4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Entities
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(entities)].map((name, idx) => (
              <motion.button
                key={`${name}-${idx}`}
                onClick={() => setSelectedNodeId(name)}
                className="px-2.5 py-1 min-h-[28px] rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors duration-150"
                style={{
                  background: "rgba(39,39,42,0.35)",
                  boxShadow:
                    "0 0 0 1px rgba(63,63,70,0.2), inset 0 1px 0 rgba(255,255,255,0.02)",
                }}
                whileHover={{
                  boxShadow:
                    "0 0 0 1px rgba(63,63,70,0.35), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              >
                {name}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div
          className="px-5 py-4"
          style={{
            background: "rgba(24,24,27,0.4)",
            boxShadow:
              "0 -1px 0 rgba(63,63,70,0.15), 0 -4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2.5">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total" value={stats.total} />
            <StatCard
              label="Current"
              value={stats.current}
              color="text-emerald-400"
            />
            <StatCard
              label="Superseded"
              value={stats.superseded}
              color="text-zinc-500"
            />
            <StatCard label="Relations" value={stats.relations} />
          </div>
          {stats.categories && Object.keys(stats.categories).length > 0 && (
            <div className="flex gap-x-3 gap-y-1.5 mt-3 flex-wrap">
              {Object.entries(stats.categories).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span
                    className="w-[6px] h-[6px] rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(cat),
                      boxShadow: `0 0 4px ${getCategoryColor(cat)}30`,
                    }}
                  />
                  <span className="text-[10px] text-zinc-500 capitalize">
                    {cat}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
