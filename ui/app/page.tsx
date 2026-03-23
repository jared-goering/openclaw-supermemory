"use client";

import dynamic from "next/dynamic";
import { MemoryProvider } from "./context";
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";

const Graph3D = dynamic(() => import("./components/Graph3D"), { ssr: false });

export default function Home() {
  return (
    <MemoryProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 relative bg-zinc-950">
          <Graph3D />
        </div>
        <RightSidebar />
      </div>
    </MemoryProvider>
  );
}
