"use client";

import { useState } from "react";
import AudiusPlayer from "@/components/AudiusPlayer";
import RetroPlayer from "@/components/RetroPlayer";

export default function AudiusPage() {
  const [playerMode, setPlayerMode] = useState("player");

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        {playerMode === "player" ? <AudiusPlayer /> : <RetroPlayer />}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>for music lovers</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlayerMode("player")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  playerMode === "player"
                    ? "border border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                PLAYER
              </button>
              <button
                onClick={() => setPlayerMode("retro")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  playerMode === "retro"
                    ? "border border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                RETRO
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
