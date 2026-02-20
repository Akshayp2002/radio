"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, SONGS_TABLE, LISTENING_TABLE, startListeningSession, endListeningSession, subscribeToListenerCount } from "@/lib/supabase";
import { PlayIcon, PauseIcon, VolumeDownIcon, VolumeUpIcon, MuteIcon } from "./Icons";

const categories = [
    { value: "chill", label: "CHILL" },
    { value: "retro", label: "RETRO" },
    { value: "lofi", label: "LOFI" },
    { value: "work", label: "WORK" },
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export default function RetroPlayer() {
    const audioRef = useRef(null);
    const loadedCategoryRef = useRef(null);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef(null);
    const maxRetries = 5;

    const [isDark, setIsDark] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [category, setCategory] = useState("chill");
    const [volume, setVolume] = useState(50);
    const [muted, setMuted] = useState(false);
    const [meterWidth, setMeterWidth] = useState(0);
    const [error, setError] = useState("");
    const [listenerCount, setListenerCount] = useState(0);
    const [retryStatus, setRetryStatus] = useState("");
    const sessionIdRef = useRef(null);

    const effectiveVolume = muted ? 0 : volume;

    const categoryLabel = useMemo(() => {
        const match = categories.find((item) => item.value === category);
        return match ? match.label : "CHILL";
    }, [category]);

    const modeText = isDark ? "DARK" : "LIGHT";
    const statusText = isLoading ? "LOADING" : isPlaying ? "PLAYING" : "STOPPED";
    const statusClass = isPlaying
        ? "ml-2 text-emerald-600 dark:text-emerald-400"
        : "ml-2 text-zinc-500 dark:text-zinc-400";

    useEffect(() => {
        const root = document.documentElement;
        const storedTheme = localStorage.getItem("theme");

        if (storedTheme === "light") {
            setIsDark(false);
            root.classList.remove("dark");
            return;
        }

        if (storedTheme === "dark") {
            setIsDark(true);
            root.classList.add("dark");
            return;
        }

        root.classList.add("dark");
        setIsDark(true);
    }, []);

    useEffect(() => {
        // Initialize session ID
        if (!sessionIdRef.current) {
            sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Subscribe to real-time listener updates
        const channel = subscribeToListenerCount(() => {
            supabase
                .from(LISTENING_TABLE)
                .select("id", { count: "exact" })
                .then(({ count }) => setListenerCount(count || 0));
        });

        // Fetch initial count
        supabase
            .from(LISTENING_TABLE)
            .select("id", { count: "exact" })
            .then(({ count }) => setListenerCount(count || 0));

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = effectiveVolume / 100;
    }, [effectiveVolume]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (!isPlaying || muted) {
                setMeterWidth(0);
                return;
            }
            const nextWidth = 25 + Math.floor(Math.random() * 65);
            setMeterWidth(nextWidth);
        }, 350);

        return () => window.clearInterval(intervalId);
    }, [isPlaying, muted]);

    const loadAudioForCategory = async (categoryValue) => {
        if (!SONGS_TABLE) {
            setError("Missing Supabase configuration.");
            return false;
        }

        try {
            let query = supabase.from(SONGS_TABLE).select("*");

            if (categoryValue) {
                query = query.ilike("category", categoryValue);
            }

            const { data, error: fetchError } = await query.limit(100);

            if (fetchError) {
                setError(`Database error: ${fetchError.message}`);
                return false;
            }

            const list = data || [];

            if (list.length === 0) {
                setError(`No songs found for "${categoryValue}". Try a different category.`);
                return false;
            }

            const doc = list[Math.floor(Math.random() * list.length)];

            const urlPool = Array.isArray(doc.song_urls)
                ? doc.song_urls
                : Array.isArray(doc.audio_urls)
                    ? doc.audio_urls
                    : Array.isArray(doc.urls)
                        ? doc.urls
                        : Array.isArray(doc.songs)
                            ? doc.songs
                            : [];

            const url = urlPool.length
                ? urlPool[Math.floor(Math.random() * urlPool.length)]
                : doc.song_url || doc.audio_url || doc.url;

            if (!url || !audioRef.current) {
                setError("No audio URL found in the selected track.");
                return false;
            }

            audioRef.current.src = url;
            audioRef.current.load();
            loadedCategoryRef.current = categoryValue;
            setError("");
            return true;
        } catch (loadError) {
            setError(`Error: ${loadError.message}`);
            return false;
        }
    };

    const handlePlayPause = async () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryCountRef.current = 0;
            setRetryStatus("");
            return;
        }

        setIsLoading(true);
        retryCountRef.current = 0;
        setRetryStatus("");
        
        const needsLoad = loadedCategoryRef.current !== category || !audioRef.current.src;
        const canPlay = needsLoad ? await loadAudioForCategory(category) : true;
        
        if (!canPlay) {
            setIsLoading(false);
            return;
        }

        try {
            await audioRef.current.play();
            setIsPlaying(true);
            setError("");
        } catch (playError) {
            retryCountRef.current = 0;
            await retryPlayback(category);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVolumeUp = () => {
        setMuted(false);
        setVolume((current) => clamp(current + 5, 0, 100));
    };

    const handleVolumeDown = () => {
        setMuted(false);
        setVolume((current) => clamp(current - 5, 0, 100));
    };

    const handleMute = () => setMuted((current) => !current);

    const retryPlayback = async (categoryValue) => {
        if (retryCountRef.current >= maxRetries) {
            setError(`Failed to load audio after ${maxRetries} attempts. Try a different category.`);
            setRetryStatus("");
            setIsLoading(false);
            return false;
        }

        const delayMs = Math.pow(2, retryCountRef.current) * 1000;
        retryCountRef.current += 1;
        setRetryStatus(`Retrying... (${retryCountRef.current}/${maxRetries})`);

        return new Promise((resolve) => {
            retryTimeoutRef.current = setTimeout(async () => {
                try {
                    const success = await loadAudioForCategory(categoryValue);
                    if (success && audioRef.current) {
                        await audioRef.current.play();
                        setIsPlaying(true);
                        setRetryStatus("");
                        setError("");
                        resolve(true);
                    } else {
                        resolve(await retryPlayback(categoryValue));
                    }
                } catch (err) {
                    resolve(await retryPlayback(categoryValue));
                }
            }, delayMs);
        });
    };

    useEffect(() => {
        if (isPlaying) {
            startListeningSession(sessionIdRef.current);
        } else {
            endListeningSession(sessionIdRef.current);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying || !audioRef.current) return;

        const swapTrack = async () => {
            setIsLoading(true);
            retryCountRef.current = 0;
            setRetryStatus("");
            
            const canPlay = await loadAudioForCategory(category);
            if (canPlay) {
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                    setError("");
                } catch (playError) {
                    await retryPlayback(category);
                }
            }
            setIsLoading(false);
        };

        swapTrack();
    }, [category, isPlaying]);

    useEffect(() => {
        if (!audioRef.current) return;

        const handleAudioError = async () => {
            const errorCode = audioRef.current?.error?.code;
            const errorMessage = [
                "Error loading audio",
                "Audio loading aborted",
                "Network error loading audio",
                "Unsupported audio format",
                "Audio decoding failed"
            ][errorCode - 1] || "Unknown audio error";

            if (isPlaying && retryCountRef.current < maxRetries) {
                await retryPlayback(category);
            } else {
                setError(errorMessage);
                setIsPlaying(false);
            }
        };

        const handleAudioEnded = () => {
            setIsPlaying(false);
            retryCountRef.current = 0;
            setRetryStatus("");
        };

        audioRef.current.addEventListener("error", handleAudioError);
        audioRef.current.addEventListener("ended", handleAudioEnded);

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener("error", handleAudioError);
                audioRef.current.removeEventListener("ended", handleAudioEnded);
            }
        };
    }, [category, isPlaying]);

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
            <main className="mx-auto w-full max-w-xl px-4 py-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_0_2px_rgba(16,185,129,.25)] dark:shadow-[0_0_0_2px_rgba(16,185,129,.2)]" />
                            <h1 className="text-sm font-semibold tracking-[0.22em] uppercase">
                                Retro Player
                            </h1>
                        </div>
                        <p className="text-xs tracking-wide text-zinc-500 dark:text-zinc-400">
                            Retro pulses, modern calm • Let the room breathe.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsDark((current) => !current)}
                        className="group inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold tracking-wide shadow-sm transition hover:bg-zinc-50 active:scale-[.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/70"
                        type="button"
                        aria-label="Toggle theme"
                    >
                        <span className="inline-flex h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                        <span className="text-zinc-700 dark:text-zinc-200">THEME</span>
                    </button>
                </div>

                <section className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_0_0_rgba(0,0,0,0.06)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_0_0_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between rounded-t-2xl border-b border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="h-3 w-3 rounded-full bg-amber-400" />
                            <span className="h-3 w-3 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-600 dark:text-zinc-300">
                            Audio Console
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">v1.0</div>
                    </div>

                    <div className="p-5">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400">
                                        Status
                                    </div>

                                    <div className="font-mono text-sm leading-5">
                                        <span className="text-zinc-700 dark:text-zinc-200">PLAYBACK:</span>
                                        <span className={statusClass}>{statusText}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-40 overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-300"
                                                style={{ width: `${meterWidth}%`, opacity: muted ? 0.45 : 1 }}
                                            />
                                        </div>
                                        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                            LVL
                                        </span>
                                    </div>

                                    <div className="font-mono text-sm leading-5">
                                        <span className="text-zinc-700 dark:text-zinc-200">LISTENERS:</span>
                                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">{listenerCount}</span>
                                    </div>
                                </div>

                                <div className="min-w-[150px]">
                                    <label className="block text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400">
                                        Category
                                    </label>

                                    <select
                                        value={category}
                                        onChange={(event) => setCategory(event.target.value)}
                                        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold tracking-wide outline-none transition focus:ring-2 focus:ring-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-emerald-500/30"
                                    >
                                        {categories.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <button
                                onClick={handlePlayPause}
                                className="relative inline-flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm font-extrabold tracking-[0.24em] shadow-[0_6px_0_0_rgba(0,0,0,0.08)] transition hover:bg-zinc-50 active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/70 dark:shadow-[0_6px_0_0_rgba(0,0,0,0.4)]"
                                type="button"
                            >
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                                    {isPlaying ? (
                                        <PauseIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                    ) : (
                                        <PlayIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                    )}
                                </span>
                                <span>{isPlaying ? "PAUSE" : "PLAY"}</span>

                                <span className={`absolute right-4 top-4 h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} opacity-70`} />
                            </button>

                            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_6px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_6px_0_0_rgba(0,0,0,0.4)]">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400">
                                        Volume
                                    </div>

                                    <button
                                        onClick={handleMute}
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold tracking-wide transition hover:bg-white active:scale-[.99] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                                    >
                                        <MuteIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
                                        <span>{muted ? "UNMUTE" : "MUTE"}</span>
                                    </button>
                                </div>

                                <div className="mt-3 flex items-center gap-3">
                                    <button
                                        onClick={handleVolumeDown}
                                        type="button"
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] transition hover:bg-white active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:shadow-[0_5px_0_0_rgba(0,0,0,0.4)]"
                                    >
                                        <VolumeDownIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                            <span>0</span>
                                            <span className="text-zinc-700 dark:text-zinc-200">
                                                {effectiveVolume}
                                            </span>
                                            <span>100</span>
                                        </div>

                                        <div className="mt-2 h-2 overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                                            <div
                                                className="h-full bg-emerald-500 transition-all"
                                                style={{ width: `${effectiveVolume}%` }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleVolumeUp}
                                        type="button"
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] transition hover:bg-white active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:shadow-[0_5px_0_0_rgba(0,0,0,0.4)]"
                                    >
                                        <VolumeUpIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-mono">
                                MODE:{" "}
                                <span className="text-zinc-700 dark:text-zinc-200">{modeText}</span>
                            </span>
                            <span className="font-mono">
                                CAT:{" "}
                                <span className="text-zinc-700 dark:text-zinc-200">
                                    {categoryLabel}
                                </span>
                            </span>
                        </div>
                    </div>
                </section>
                <p className="mt-6 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {retryStatus || error || "Ready to play. Select a category and press play."}
                </p>
                <audio
                    ref={audioRef}
                    onPlay={() => {
                        setIsPlaying(true);
                        retryCountRef.current = 0;
                        setRetryStatus("");
                    }}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                        setIsPlaying(false);
                        retryCountRef.current = 0;
                        setRetryStatus("");
                    }}
                    crossOrigin="anonymous"
                    style={{ display: "none" }}
                />
            </main>
        </div>
    );
}
