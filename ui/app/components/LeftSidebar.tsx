"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemory } from "../context";
import { getCategoryColor } from "../types";

export default function LeftSidebar() {
  const { refreshGraph, stats, entities, ingestFeed, addToFeed, setSelectedNodeId } =
    useMemory();
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
      const memories: Array<{ id?: string; content: string; category: string }> =
        data.memories ?? data.extracted ?? [];
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
      className="w-80 shrink-0 flex flex-col bg-zinc-900/50 overflow-hidden"
      style={{
        boxShadow: "1px 0 0 rgba(63,63,70,0.3), 4px 0 16px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ boxShadow: "0 1px 0 rgba(63,63,70,0.3), 0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"
            style={{ boxShadow: "0 0 8px rgba(59,130,246,0.5)" }}
          />
          Memory Engine
        </h1>
        <p className="text-[11px] text-zinc-500 mt-1">
          Visualize AI agent memory in motion
        </p>
      </div>

      {/* Ingestion */}
      <div
        className="p-4"
        style={{ boxShadow: "0 1px 0 rgba(63,63,70,0.3), 0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          Ingest
        </h2>
        {/* outer: rounded-xl (12px), padding ~8px via border → inner: rounded-lg (8px) = concentric */}
        <textarea
          className="w-full bg-zinc-800/80 rounded-lg p-3 text-sm resize-none focus:outline-none placeholder:text-zinc-600 transition-[border-color,box-shadow] duration-200"
          style={{
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(63,63,70,0.3)",
          }}
          rows={4}
          placeholder="Paste text to extract memories..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) handleIngest();
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow =
              "inset 0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(59,130,246,0.5), 0 0 8px rgba(59,130,246,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow =
              "inset 0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(63,63,70,0.3)";
          }}
        />
        <motion.button
          className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-sm font-medium py-2 rounded-lg transition-[background-color] duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.2)",
          }}
          onClick={handleIngest}
          disabled={ingesting || !text.trim()}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          {ingesting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Extracting...
            </span>
          ) : (
            "Ingest"
          )}
        </motion.button>
        <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
          Cmd+Enter to submit
        </p>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          Recent Extractions
        </h2>
        {ingestFeed.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No memories extracted yet</p>
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
                  className="rounded-xl p-2.5 cursor-default"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(63,63,70,0.2), 0 2px 8px rgba(0,0,0,0.15)",
                    background: "rgba(39,39,42,0.25)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(item.category),
                        boxShadow: `0 0 4px ${getCategoryColor(item.category)}40`,
                      }}
                    />
                    <span className="text-[10px] text-zinc-500 uppercase font-medium">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
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
          className="p-4 max-h-36 overflow-y-auto"
          style={{ boxShadow: "0 -1px 0 rgba(63,63,70,0.3), 0 -4px 12px rgba(0,0,0,0.1)" }}
        >
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Entities
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((name) => (
              <motion.button
                key={name}
                onClick={() => setSelectedNodeId(name)}
                className="px-2.5 py-1 min-h-[28px] bg-zinc-800/60 hover:bg-zinc-700/60 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 transition-[background-color,color] duration-150"
                style={{
                  boxShadow: "0 0 0 1px rgba(63,63,70,0.2)",
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
          className="p-4 bg-zinc-900/80"
          style={{ boxShadow: "0 -1px 0 rgba(63,63,70,0.3), 0 -4px 12px rgba(0,0,0,0.1)" }}
        >
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total</span>
              <span className="font-mono text-zinc-300">{stats.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Current</span>
              <span className="font-mono text-green-400">{stats.current.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Superseded</span>
              <span className="font-mono text-zinc-500">{stats.superseded.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Relations</span>
              <span className="font-mono text-zinc-300">{stats.relations.toLocaleString()}</span>
            </div>
          </div>
          {stats.categories && Object.keys(stats.categories).length > 0 && (
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {Object.entries(stats.categories).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(cat),
                      boxShadow: `0 0 0 1px ${getCategoryColor(cat)}20`,
                    }}
                  />
                  <span className="text-[10px] text-zinc-500">
                    {cat} <span className="font-mono">{count}</span>
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
