"use client";
import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Music, Send, Loader2, Copy, Check, AlertCircle, Play, Pause } from "lucide-react";

// Type definition to prevent the 'never' error
interface Song {
  title: string;
  viral_para: string;
  timestamp: string;
  tip: string;
  yt_link?: string;
  previewUrl?: string;
  preview_url?: string;
  artworkUrl?: string;
}

export default function BeatCutApp() {
  const [formData, setFormData] = useState({
    category: "",
    feeling: "happy",
    vibeTag: "viral",
    tags: [] as string[],
    language: "Hindi",
  });

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audioErrorIndex, setAudioErrorIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioListenersAttachedRef = useRef(false);
  const [visibleCount, setVisibleCount] = useState(2);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isTogglingRef = useRef(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSongs([]);
    setVisibleCount(2);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData }),
      });

      if (!res.ok) throw new Error("Failed to fetch from API");

      const data = await res.json();

      // Array check prevents .map() crashes if AI returns an object
      if (Array.isArray(data)) {
        setSongs(data);
      } else {
        console.error("API did not return an array:", data);
        setError("The AI response was formatted incorrectly. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Check your API key or internet.");
    } finally {
      setLoading(false);
    }
  };

  const copyRecipe = (song: Song, index: number) => {
    const text = `Song: ${song.title}\nCut at: ${song.timestamp}\nTip: ${song.tip}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getPreviewUrl = (song: Song) => song.previewUrl || song.preview_url || "";

  const togglePreview = async (song: Song, index: number) => {
    const url = getPreviewUrl(song);
    if (!url) return;

    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    if (!audioListenersAttachedRef.current) {
      audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime || 0));
      audio.addEventListener("durationchange", () => setDuration(audio.duration || 0));
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));
      audioListenersAttachedRef.current = true;
    }

    if (playingIndex === index && !audio.paused) {
      audio.pause();
      setPlayingIndex(null);
      isTogglingRef.current = false;
      return;
    }

    if (!audio.paused) {
      audio.pause();
    }

    if (audio.src !== url) {
      audio.src = url;
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);
      audio.load();
    }

    audio.onended = () => {
      setPlayingIndex(null);
      setCurrentTime(0);
    };

    try {
      await audio.play();
      setAudioErrorIndex(null);
      setPlayingIndex(index);
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    } catch (err) {
      console.error("Audio preview failed:", err);
      setAudioErrorIndex(index);
      setPlayingIndex(null);
    } finally {
      isTogglingRef.current = false;
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlayingIndex(null);
    setCurrentTime(0);
    setDuration(0);
  }, [songs]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seekPreview = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || playingIndex !== index || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const nextTime = ratio * duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="min-h-screen text-[var(--md-text)] px-4 md:px-12 py-12 selection:bg-violet-500/30 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div className="text-sm font-semibold tracking-[0.3em] uppercase text-[var(--md-text)]">
            EditorsChoice
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            <a className="hover:text-[var(--md-text)] transition-colors" href="#">
              Home
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="/inspiration">
              Editing Inspiration
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="/help">
              Help
            </a>
          </div>
        </nav>

        <header className="relative text-left mb-12">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
              Creator Studio
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[var(--md-text)] mb-2">
            EditorsChoice
          </h1>
          <p className="text-[var(--md-text-muted)] text-base max-w-2xl">
            Find music that fits your edit, fast.
          </p>
          <div className="absolute top-0 right-0" />
        </header>

        <section className="bg-[var(--md-surface-3)] p-6 rounded-[28px] border border-[var(--md-outline)] mb-12 backdrop-blur-2xl shadow-xl">
          <form onSubmit={handleSearch} className="flex flex-col items-center gap-4 px-2 py-4">
            <div className="w-full max-w-2xl relative">
              <input
                list="category-options"
                placeholder="Video/Post Category"
                className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-5 py-4 rounded-[18px] focus:ring-2 focus:ring-[var(--md-primary)] outline-none transition-all placeholder:text-[rgba(226,232,240,0.4)] w-full text-base sm:text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
              <datalist id="category-options">
                <option value="Pre wedding" />
                <option value="Makeup" />
                <option value="Food" />
                <option value="Travel vlog" />
                <option value="Road trip" />
                <option value="Religious" />
              </datalist>
            </div>

            <div className="w-full max-w-3xl space-y-4">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Feeling
              </div>
              <div className="flex flex-wrap gap-2">
                {["happy", "sad", "energetic", "romantic", "minimilistic", "golden hour"].map(
                  (option) => {
                    const active = formData.feeling === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData({ ...formData, feeling: option })}
                        className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                          active
                            ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
                            : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Language
              </div>
              <div className="flex flex-wrap gap-2">
                {["Hindi", "Punjabi", "English", "Pakistani"].map((option) => {
                  const active = formData.language === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData({ ...formData, language: option })}
                      className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                        active
                          ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
                          : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Hashtag
              </div>
              <div className="flex flex-wrap gap-2">
                {["viral", "trending", "classic", "old"].map((option) => {
                  const active = formData.vibeTag === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData({ ...formData, vibeTag: option })}
                      className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                        active
                          ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
                          : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Depth
              </div>
              <div className="flex flex-wrap gap-2">
                {["cinematic", "attitude", "aggressive"].map((tag) => {
                  const active = formData.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          tags: active ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
                        }))
                      }
                      className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
                        active
                          ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
                          : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

              <button
                disabled={loading}
                className="bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-lg px-7 sm:px-9 py-3"
              >
              {loading ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Analyzing..." : "Search Song"}
            </button>
          </form>
        </section>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-[20px] mb-8 text-red-300 backdrop-blur-xl">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid gap-5">
          {songs.slice(0, visibleCount).map((song, idx) => {
            const indexLabel = idx + 1;
            return (
              <div
                key={idx}
                className="group bg-[var(--md-surface-2)] border border-[var(--md-outline)] p-5 rounded-[22px] hover:border-[rgba(124,131,255,0.5)] transition-all flex flex-col md:flex-row justify-between items-center gap-5 backdrop-blur-xl shadow-lg"
              >
                <div className="flex-1 flex items-center gap-5">
                  <div className="text-lg font-semibold text-[var(--md-text-muted)] w-10 text-center">
                    {indexLabel}
                  </div>
                    <div className="w-16 h-16 rounded-[18px] overflow-hidden bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                      {song.artworkUrl ? (
                        <img
                          src={song.artworkUrl}
                          alt={`${song.title} thumbnail`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Music className="text-[var(--md-primary)] w-6 h-6" />
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-4 min-w-0">
                        <h3 className="text-xl font-semibold tracking-tight truncate">{song.title}</h3>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px] text-[var(--md-text-muted)] font-semibold tracking-wide">
                            <span>{playingIndex === idx ? formatTime(currentTime) : "0:00"}</span>
                            <span>{playingIndex === idx ? formatTime(duration) : "0:00"}</span>
                          </div>
                          <div
                            className="h-2 rounded-full bg-[var(--md-surface)] overflow-hidden border border-[var(--md-outline)] cursor-pointer"
                            onClick={(event) => seekPreview(idx, event)}
                            title={playingIndex === idx ? "Seek preview" : "Play to enable seeking"}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 transition-[width] duration-150"
                              style={{
                                width:
                                  playingIndex === idx && duration > 0
                                    ? `${Math.min((currentTime / duration) * 100, 100)}%`
                                    : "0%",
                              }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => togglePreview(song, idx)}
                          disabled={!getPreviewUrl(song)}
                          className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-4 rounded-[18px] transition-all shadow-xl active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            audioErrorIndex === idx
                              ? "Preview failed to load"
                              : getPreviewUrl(song)
                                ? playingIndex === idx
                                  ? "Pause preview"
                                  : "Play preview"
                                : "Preview unavailable"
                          }
                        >
                          {playingIndex === idx ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="text-xs text-[var(--md-text-muted)] font-semibold">
                        {song.tip}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 min-w-fit">
                    <button
                      onClick={() => copyRecipe(song, idx)}
                      className="bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:bg-[rgba(124,131,255,0.9)] p-4 rounded-[16px] transition-all shadow-lg active:scale-90"
                      title="Copy Recipe"
                    >
                      {copiedIndex === idx ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              );
            })}

            {songs.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + 2, songs.length))}
                className="mx-auto bg-[var(--md-surface-2)] hover:bg-[rgba(124,131,255,0.12)] text-[var(--md-text)] px-6 py-3 rounded-full font-semibold tracking-[0.2em] uppercase transition-all active:scale-95 border border-[var(--md-outline)]"
              >
                More
              </button>
            )}

            {!loading && songs.length === 0 && !error && (
              <div className="text-center py-24 text-[var(--md-text-muted)] border border-[var(--md-outline)] rounded-[28px] bg-[var(--md-surface-2)] backdrop-blur-xl">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-xl font-semibold">Ready to find your next hit?</p>
                <p className="text-sm mt-1">Fill the details and hit "Search Song"</p>
              </div>
            )}
        </div>
      </div>

      <footer className="mt-auto border-t border-[var(--md-outline)] pt-6 text-[var(--md-text-muted)] text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="uppercase tracking-[0.35em] font-semibold text-center md:text-left">
            Built with Google Gemini AI and Next.js - 2026 Edition
          </div>
          <div className="flex flex-wrap items-center gap-4 uppercase tracking-[0.3em] font-semibold">
            <a className="hover:text-[var(--md-text)] transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="#">
              Copyrighted Material
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
