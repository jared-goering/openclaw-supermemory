export interface MemoryNode {
  id: string;
  content: string;
  category: string;
  confidence: number;
  documentDate: string | null;
  eventDate: string | null;
  isCurrent: boolean;
  version: number;
  session: string | null;
  agent: string | null;
  createdAt: string;
}

export interface MemoryEdge {
  source: string;
  target: string;
  type: "updates" | "contradicts" | "extends" | "supports" | "derives";
  context: string;
  sourceContent: string;
  targetContent: string;
}

export interface SearchResult {
  id: string;
  content: string;
  category: string;
  similarity: number;
  confidence: number;
  isCurrent: boolean;
}

export interface Stats {
  total: number;
  current: number;
  superseded: number;
  relations: number;
  categories: Record<string, number>;
}

export interface IngestItem {
  id: string;
  content: string;
  category: string;
  timestamp: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  person: "#60a5fa",     // blue-400
  project: "#4ade80",    // green-400
  event: "#fbbf24",      // amber-400
  decision: "#c084fc",   // purple-400
  preference: "#f472b6", // pink-400
  insight: "#2dd4bf",    // teal-400
  recommendation: "#fb923c", // orange-400
  goal: "#facc15",       // yellow-400
};

export const CATEGORY_COLOR_DEFAULT = "#94a3b8"; // slate-400

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category?.toLowerCase()] ?? CATEGORY_COLOR_DEFAULT;
}

export const EDGE_COLORS: Record<string, string> = {
  updates: "#a1a1aa",
  contradicts: "#ef4444",
  extends: "#60a5fa",
  supports: "#4ade80",
  derives: "#c084fc",
};
