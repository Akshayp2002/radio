"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon, VolumeDownIcon, VolumeUpIcon, MuteIcon, NextIcon } from "./Icons";

const AUDIUS_API = "https://api.audius.co/v1";

    const fetchWithHeaders = async (url) => {
        // Use local API proxy instead of direct Audius API calls
        if (url.includes("/trending")) {
            return fetch(`/api/audius?endpoint=/trending&limit=20`);
        } else if (url.includes("/tracks/search")) {
            const query = new URL(url).searchParams.get("q");
            return fetch(`/api/audius?endpoint=/tracks/search&q=${encodeURIComponent(query)}`);
        } else if (url.includes("/users/")) {
            const userId = url.split("/users/")[1].split("/")[0];
            return fetch(`/api/audius?endpoint=/users/${userId}/tracks`);
        }
        return fetch(url);
    };

export default function AudiusPlayer() {
    const audioRef = useRef(null);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef(null);
    const maxRetries = 5;

    const [isDark, setIsDark] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volume, setVolume] = useState(50);
    const [muted, setMuted] = useState(false);
    const [meterWidth, setMeterWidth] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState("");
    const [retryStatus, setRetryStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [tracks, setTracks] = useState([]);
    const [topTracks, setTopTracks] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
    const [currentArtist, setCurrentArtist] = useState(null);
    const [artistAlbums, setArtistAlbums] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [failedImages, setFailedImages] = useState(new Set());

    const effectiveVolume = muted ? 0 : volume;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
        const root = document.documentElement;
        root.classList.toggle("dark", isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = effectiveVolume / 100;
    }, [effectiveVolume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                setMeterWidth(Math.min(progress, 100));
                setCurrentTime(Math.floor(audio.currentTime));
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(Math.floor(audio.duration));
        };

        const handleEnded = () => {
            setMeterWidth(0);
            setCurrentTime(0);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const searchTracks = async (query) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError("");
        try {
            const response = await fetchWithHeaders(`${AUDIUS_API}/tracks/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const filteredTracks = data.data.filter(t => t.preview_cid || t.track_cid);
                setTracks(filteredTracks);
                setError("");
            } else {
                setError("No tracks found. Try another search.");
                setTracks([]);
            }
        } catch (err) {
            setError(`Search failed: ${err.message}`);
            setTracks([]);
        } finally {
            setIsSearching(false);
        }
    };

    const getArtistAlbums = async (artistId) => {
        try {
            const response = await fetchWithHeaders(`${AUDIUS_API}/users/${artistId}/tracks`);
            const data = await response.json();
            const filteredAlbums = (data.data || []).filter(t => t.preview_cid || t.track_cid);
            setArtistAlbums(filteredAlbums);
        } catch (err) {
            console.error("Failed to fetch artist albums:", err);
        }
    };

    const getTopTracks = async () => {
        try {
            setIsLoadingInitial(true);
            const response = await fetchWithHeaders(`${AUDIUS_API}/trending?limit=20`);
            const data = await response.json();
            
            console.log("Trending tracks data:", data);
            
            if (data.data && data.data.length > 0) {
                // Filter for tracks with either preview_cid or track_cid
                const filteredTracks = data.data.filter(t => t.preview_cid || t.track_cid);
                console.log("Filtered tracks with CID:", filteredTracks);
                setTopTracks(filteredTracks);
                setTracks(filteredTracks);
                setError("");
            } else {
                console.log("No trending data");
                setError("No tracks available");
            }
        } catch (err) {
            console.error("Failed to fetch top tracks:", err);
            setError("Failed to load tracks. Please refresh the page.");
        } finally {
            setIsLoadingInitial(false);
        }
    };

    const playTrack = async (track, trackList = null) => {
        console.log("Track object:", track);
        console.log("Track artwork structure:", track.artwork);
        
        if (!track.id) {
            setError("This track cannot be streamed - no ID available.");
            console.error("No ID in track:", track);
            return;
        }

        setCurrentTrack(track);
        setCurrentArtist(track.user);
        
        // Set track index for next button functionality
        if (trackList) {
            const idx = trackList.findIndex(t => t.id === track.id);
            setCurrentTrackIndex(idx >= 0 ? idx : -1);
        }
        
        getArtistAlbums(track.user.id);
        setIsLoading(true);
        retryCountRef.current = 0;
        setRetryStatus("");
        setMeterWidth(0);
        setCurrentTime(0);
        setDuration(0);

        try {
            // Use Audius API streaming endpoint
            const streamUrl = `/api/audius?endpoint=/tracks/${track.id}/stream`;
            console.log("Stream URL:", streamUrl);
            
            if (audioRef.current) {
                // Stop current playback before switching
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                
                audioRef.current.src = "";
                audioRef.current.src = streamUrl;
                audioRef.current.crossOrigin = "anonymous";
                
                // Add ended event listener for auto-play next
                audioRef.current.onended = () => {
                    console.log("Track ended, playing next...");
                    playNextTrack();
                };
                
                audioRef.current.load();
                
                // Wait a moment for load to start
                setTimeout(() => {
                    if (audioRef.current && currentTrack?.id === track.id) {
                        audioRef.current.play().catch(err => {
                            console.log("Play error", err);
                            retryPlayback(track);
                        });
                    }
                }, 500);
                
                setIsPlaying(true);
                setError("");
            }
        } catch (err) {
            console.error("playTrack error:", err);
            await retryPlayback(track);
        } finally {
            setIsLoading(false);
        }
    };

    const playNextTrack = () => {
        if (currentTrackIndex < 0 || tracks.length === 0) return;
        
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        playTrack(tracks[nextIndex], tracks);
    };

    const retryPlayback = async (track) => {
        if (retryCountRef.current >= maxRetries) {
            setError(`Failed to stream track after ${maxRetries} attempts.`);
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
                    const streamUrl = `/api/audius?endpoint=/tracks/${track.id}/stream`;
                    if (audioRef.current) {
                        audioRef.current.src = streamUrl;
                        audioRef.current.crossOrigin = "anonymous";
                        audioRef.current.load();
                        setTimeout(() => {
                            audioRef.current?.play().catch(e => console.error(e));
                        }, 500);
                        setIsPlaying(true);
                        setRetryStatus("");
                        setError("");
                        resolve(true);
                    }
                } catch (err) {
                    resolve(await retryPlayback(track));
                }
            }, delayMs);
        });
    };

    const handlePlayPause = async () => {
        if (!audioRef.current || !currentTrack) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryCountRef.current = 0;
            setRetryStatus("");
            return;
        }

        try {
            await audioRef.current.play();
            setIsPlaying(true);
            setError("");
        } catch (err) {
            await retryPlayback(currentTrack);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
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

    const handleImageError = (trackId) => {
        setFailedImages(prev => new Set([...prev, trackId]));
        console.log("Image failed to load for track:", trackId);
    };

    const handleAutoNext = () => {
        if (tracks.length > 0 && currentTrackIndex >= 0) {
            playNextTrack();
        } else if (topTracks.length > 0) {
            playTrack(topTracks[0], topTracks);
        }
    };

    useEffect(() => {
        if (!audioRef.current) return;

        const handleAudioError = async () => {
            if (isPlaying && currentTrack && retryCountRef.current < maxRetries) {
                await retryPlayback(currentTrack);
            } else {
                setError("Playback failed. Try another track.");
                setIsPlaying(false);
            }
        };

        audioRef.current.addEventListener("error", handleAudioError);
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener("error", handleAudioError);
            }
        };
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);

    // Fetch top tracks on component mount
    useEffect(() => {
        getTopTracks();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_0_2px_rgba(168,85,247,.25)] dark:shadow-[0_0_0_2px_rgba(168,85,247,.2)]" />
                            <h1 className="text-sm font-semibold tracking-[0.22em] uppercase">
                                Audius Player
                            </h1>
                        </div>
                        <p className="text-xs tracking-wide text-zinc-500 dark:text-zinc-400">
                            Discover music from Audius streaming network
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

                <section className="rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_0_0_rgba(0,0,0,0.06)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_0_0_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between rounded-t-2xl border-b border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="h-3 w-3 rounded-full bg-amber-400" />
                            <span className="h-3 w-3 rounded-full bg-purple-500" />
                        </div>
                        <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-600 dark:text-zinc-300">
                            Audius Console
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">v1.0</div>
                    </div>

                    <div className="p-5">
                        {/* Horizontal Album Carousel */}
                        {tracks && tracks.length > 0 ? (
                            <div className="mb-6">
                                <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-3">
                                    {searchQuery ? "Search Results" : "Top Tracks"}
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}>
                                    {tracks.slice(0, 15).map((track) => (
                                        <button
                                            key={track.id}
                                            onClick={() => playTrack(track, tracks)}
                                            className={currentTrack?.id === track.id ? "flex-shrink-0 rounded-lg overflow-hidden transition-all border-2 border-purple-500 scale-105 shadow-lg" : "flex-shrink-0 rounded-lg overflow-hidden transition-all border-2 border-transparent hover:scale-105"}
                                            title={track.title}
                                        >
                                            {track.artwork && (track.artwork['1000x1000'] || track.artwork['480x480']) && !failedImages.has(track.id) ? (
                                                <img
                                                    src={track.artwork['1000x1000'] || track.artwork['480x480']}
                                                    alt={track.title}
                                                    onError={(e) => {
                                                        handleImageError(track.id);
                                                        console.log("Image load failed for:", track.title);
                                                    }}
                                                    className="w-28 h-28 object-cover"
                                                />
                                            ) : null}
                                            {(!track.artwork?.['1000x1000'] && !track.artwork?.['480x480']) || failedImages.has(track.id) ? (
                                                <div className="w-28 h-28 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                                                    <span className="text-2xl">🎵</span>
                                                </div>
                                            ) : null}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : isLoadingInitial ? (
                            <div className="mb-6 text-center text-zinc-500 dark:text-zinc-400 py-8">
                                <p>🎵 Loading top tracks...</p>
                            </div>
                        ) : (
                            <div className="mb-6 text-center text-zinc-500 dark:text-zinc-400 py-8">
                                <p>No tracks available</p>
                            </div>
                        )}

                        {/* Search Section */}
                        <div className="mb-5">
                            <label className="block text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                                Search Tracks
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && searchTracks(searchQuery)}
                                    placeholder="Search by artist or track..."
                                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold tracking-wide outline-none transition focus:ring-2 focus:ring-purple-300 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-purple-500/30"
                                />
                                <button
                                    onClick={() => searchTracks(searchQuery)}
                                    disabled={isSearching}
                                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold tracking-wide transition hover:bg-zinc-50 active:scale-[.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/70 disabled:opacity-50"
                                >
                                    {isSearching ? "SEARCHING..." : "SEARCH"}
                                </button>
                            </div>
                        </div>

                        {/* Current Track */}
                        {currentTrack && (
                            <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-3">
                                    Now Playing
                                </div>
                                <div className="flex gap-4">
                                    {currentTrack.artwork && (currentTrack.artwork['480x480'] || currentTrack.artwork['150x150']) ? (
                                        <img
                                            src={currentTrack.artwork['480x480'] || currentTrack.artwork['150x150']}
                                            alt={currentTrack.title}
                                            onError={(e) => {
                                                e.target.style.display = "none";
                                                console.log("Now playing image failed:", currentTrack.title);
                                            }}
                                            className="w-24 h-24 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                                            <span className="text-3xl">🎵</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                            {currentTrack.title}
                                        </div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                            By {currentArtist?.name}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pt-3">
                                            <div className="text-xs text-zinc-500 dark:text-zinc-500">{formatTime(currentTime)}</div>
                                            <div className="h-2 flex-1 overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                                <div
                                                    className="h-full bg-purple-500 transition-all duration-300"
                                                    style={{ width: `${meterWidth}%`, opacity: muted ? 0.45 : 1 }}
                                                />
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-500">{formatTime(duration)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                                Status
                            </div>
                            <div className="font-mono text-sm leading-5">
                                <span className="text-zinc-700 dark:text-zinc-200">PLAYBACK:</span>
                                <span className={statusClass}>{statusText}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <button
                                onClick={handlePlayPause}
                                disabled={!currentTrack}
                                className="relative inline-flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm font-extrabold tracking-[0.24em] shadow-[0_6px_0_0_rgba(0,0,0,0.08)] transition hover:bg-zinc-50 active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.08)] disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/70 dark:shadow-[0_6px_0_0_rgba(0,0,0,0.4)]"
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
                                <span className={`absolute right-4 top-4 h-2 w-2 rounded-full ${isPlaying ? "bg-purple-500 animate-pulse" : "bg-red-500"} opacity-70`} />
                            </button>

                            <button
                                onClick={playNextTrack}
                                disabled={!currentTrack || tracks.length === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm font-extrabold tracking-[0.24em] shadow-[0_6px_0_0_rgba(0,0,0,0.08)] transition hover:bg-zinc-50 active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.08)] disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/70 dark:shadow-[0_6px_0_0_rgba(0,0,0,0.4)]"
                                type="button"
                            >
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                                    <NextIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                </span>
                                <span>NEXT</span>
                            </button>

                            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_6px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_6px_0_0_rgba(0,0,0,0.4)]">
                                <div className="flex items-center justify-between mb-3">
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
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleVolumeDown}
                                        type="button"
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] transition hover:bg-white active:translate-y-[2px] active:shadow-[0_3px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:shadow-[0_5px_0_0_rgba(0,0,0,0.4)]"
                                    >
                                        <VolumeDownIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                                    </button>
                                    <div className="flex-1">
                                        <div className="text-xs text-center text-zinc-600 dark:text-zinc-400 mb-1">
                                            {effectiveVolume}
                                        </div>
                                        <div className="h-2 overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
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

                        {/* Tracks List */}
                        {tracks.length > 0 && (
                            <div className="mb-5">
                                <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-3">
                                    {searchQuery ? `Search Results (${tracks.length})` : `Top Tracks (${tracks.length})`}
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {tracks.map((track, idx) => (
                                        <button
                                            key={track.id}
                                            onClick={() => playTrack(track, tracks)}
                                            className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition flex items-center gap-3 ${
                                                currentTrack?.id === track.id
                                                    ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/20"
                                                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                            }`}
                                        >
                                            {track.artwork && (track.artwork['150x150'] || track.artwork['480x480']) ? (
                                                <img
                                                    src={track.artwork['150x150'] || track.artwork['480x480']}
                                                    alt={track.title}
                                                    onError={(e) => {
                                                        e.target.style.display = "none";
                                                    }}
                                                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs">🎵</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                    {idx + 1}. {track.title}
                                                </div>
                                                <div className="text-zinc-600 dark:text-zinc-400 truncate">
                                                    {track.user.name}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Artist Tracks */}
                        {artistAlbums.length > 0 && (
                            <div className="mb-5">
                                <div className="text-[11px] font-semibold tracking-[0.28em] uppercase text-zinc-500 dark:text-zinc-400 mb-3">
                                    More from {currentArtist?.name} ({artistAlbums.length})
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {artistAlbums.map((track) => (
                                        <button
                                            key={track.id}
                                            onClick={() => playTrack(track, artistAlbums)}
                                            className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition flex items-center gap-3 ${
                                                currentTrack?.id === track.id
                                                    ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/20"
                                                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                            }`}
                                        >
                                            {track.artwork && (track.artwork['150x150'] || track.artwork['480x480']) ? (
                                                <img
                                                    src={track.artwork['150x150'] || track.artwork['480x480']}
                                                    alt={track.title}
                                                    onError={(e) => {
                                                        e.target.style.display = "none";
                                                    }}
                                                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs">🎵</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                    {track.title}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-mono">
                                MODE: <span className="text-zinc-700 dark:text-zinc-200">{modeText}</span>
                            </span>
                        </div>
                    </div>
                </section>

                <p className="mt-6 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {retryStatus || error || "Search for tracks and start listening from Audius"}
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
                        handleAutoNext();
                    }}
                    crossOrigin="anonymous"
                    style={{ display: "none" }}
                />
            </main>
        </div>
    );
}
