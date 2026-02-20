"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-[0.22em] uppercase mb-3">
            Music Players
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm tracking-wide">
            Choose your music streaming experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Retro Player Card */}
          <Link href="/retro">
            <div className="group h-full rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_0_0_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_12px_0_0_rgba(0,0,0,0.1)] cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_0_0_rgba(0,0,0,0.35)] dark:hover:shadow-[0_12px_0_0_rgba(0,0,0,0.5)]">
              <div className="p-6">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">🎵</span>
                </div>
                <h2 className="text-lg font-bold tracking-wide uppercase mb-2">
                  Retro Player
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Stream music from your personal collection with a retro console vibe
                </p>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  <span>Enter Player</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Audius Player Card */}
          <Link href="/audius">
            <div className="group h-full rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_0_0_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_12px_0_0_rgba(0,0,0,0.1)] cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_0_0_rgba(0,0,0,0.35)] dark:hover:shadow-[0_12px_0_0_rgba(0,0,0,0.5)]">
              <div className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">🎧</span>
                </div>
                <h2 className="text-lg font-bold tracking-wide uppercase mb-2">
                  Audius Player
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Discover and stream music from Audius decentralized platform with retro style
                </p>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-semibold">
                  <span>Enter Player</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400 mb-3">
            Features
          </h3>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>✓ Real-time listener count tracking</li>
            <li>✓ Dark/Light theme support</li>
            <li>✓ Auto-retry on playback errors</li>
            <li>✓ Volume control & muting</li>
            <li>✓ Retro 90s console aesthetic</li>
            <li>✓ Responsive mobile design</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
