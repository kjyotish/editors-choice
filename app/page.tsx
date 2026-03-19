"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Music,
  Send,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Play,
  Pause,
  SlidersHorizontal,
  X,
} from "lucide-react";
import PageShell from "./components/PageShell";
import TrendInsights from "./components/TrendInsights";

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

const RESULTS_PER_PAGE = 10;
const LOADING_HINTS = [
  "Scanning current trends and matching your edit style...",
  "Checking fresh song ideas with the right mood and language...",
  "Filtering for tracks that fit your reel pacing and vibe...",
];

export default function BeatCutApp() {
  const [formData, setFormData] = useState({
    category: "",
    feeling: "happy",
    vibeTag: "viral",
    tags: [] as string[],
    language: "Hindi",
    version: "song",
  });

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audioErrorIndex, setAudioErrorIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioListenersAttachedRef = useRef(false);
  const lastProgressUpdateRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isTogglingRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shareOpenIndex, setShareOpenIndex] = useState<number | null>(null);
  const [excludeTitles, setExcludeTitles] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const fetchSongs = async (useAltKey: boolean) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, excludeTitles, useAltKey }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to fetch from API",
        );
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("ec_recent_titles");
      const cachedAt = localStorage.getItem("ec_recent_titles_at");
      if (cached && cachedAt) {
        const ageMs = Date.now() - Number(cachedAt);
        if (ageMs < 24 * 60 * 60 * 1000) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setExcludeTitles(parsed);
          return;
        }
      }
      localStorage.removeItem("ec_recent_titles");
      localStorage.removeItem("ec_recent_titles_at");
      setExcludeTitles([]);
    } catch {
      setExcludeTitles([]);
    }
  }, []);

  // Submit prompt to generate song ideas.
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCategory = formData.category.trim();
    if (!normalizedCategory) {
      setError("Enter a category before searching.");
      return;
    }

    setLoading(true);
    setError(null);
    setSongs([]);
    setCurrentPage(1);

    try {
      const data = await fetchSongs(false);

      // Array check prevents .map() crashes if AI returns an object
      if (Array.isArray(data)) {
        const playable = data.filter((song: Song) => {
          const preview = getPreviewUrl(song);
          return typeof preview === "string" && preview.trim().length > 0;
        });
        setSongs(playable);
        setCurrentPage(1);
        const titles = playable
          .map((song: Song) => String(song.title || "").trim())
          .filter((title: string) => title.length > 0);
        if (titles.length > 0) {
          const unique = Array.from(new Set(titles)).slice(0, 100);
          setExcludeTitles(unique);
          try {
            localStorage.setItem("ec_recent_titles", JSON.stringify(unique));
            localStorage.setItem("ec_recent_titles_at", String(Date.now()));
          } catch {
            // ignore storage errors
          }
        }
      } else {
        console.error("API did not return an array:", data);
        setError(
          "The AI response was formatted incorrectly. Please try again.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection error. Check your API key or internet.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchSongs(true);
      if (Array.isArray(data)) {
        const playable = data.filter((song: Song) => {
          const preview = getPreviewUrl(song);
          return typeof preview === "string" && preview.trim().length > 0;
        });
        setSongs((prev) => {
          const nextSongs = [...prev, ...playable];
          setCurrentPage(
            Math.max(1, Math.ceil(nextSongs.length / RESULTS_PER_PAGE)),
          );
          return nextSongs;
        });
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        const titles = playable
          .map((song: Song) => String(song.title || "").trim())
          .filter((title: string) => title.length > 0);
        if (titles.length > 0) {
          const unique = Array.from(
            new Set([...excludeTitles, ...titles]),
          ).slice(0, 100);
          setExcludeTitles(unique);
          try {
            localStorage.setItem("ec_recent_titles", JSON.stringify(unique));
            localStorage.setItem("ec_recent_titles_at", String(Date.now()));
          } catch {
            // ignore storage errors
          }
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection error. Check your API key or internet.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setLoadingHintIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingHintIndex((current) => (current + 1) % LOADING_HINTS.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [loading]);
  // Copy recipe text for a song.
  const copyRecipe = (song: Song, index: number) => {
    const text = `Song: ${song.title}\nCut at: ${song.timestamp}\nTip: ${song.tip}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Get preview URL from API response (supports legacy key).
  const getPreviewUrl = (song: Song) =>
    song.previewUrl || song.preview_url || "";
  // Build a YouTube link (direct if available, otherwise search).
  const getYoutubeLink = (song: Song) => {
    if (song.yt_link && song.yt_link.trim().length > 0)
      return song.yt_link.trim();
    const query = encodeURIComponent(song.title || "song");
    return `https://www.youtube.com/results?search_query=${query}`;
  };
  // Resolve YouTube thumbnail for a direct YouTube link.
  const getYoutubeThumbnail = (song: Song) => {
    if (!song.yt_link) return "";
    const match = song.yt_link.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    );
    if (!match) return "";
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  };

  // Play/pause the audio preview for a specific song.
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
      audio.addEventListener("timeupdate", () => {
        const now = performance.now();
        if (now - lastProgressUpdateRef.current < 180) return;
        lastProgressUpdateRef.current = now;
        setCurrentTime(audio.currentTime || 0);
      });
      audio.addEventListener("durationchange", () =>
        setDuration(audio.duration || 0),
      );
      audio.addEventListener("loadedmetadata", () =>
        setDuration(audio.duration || 0),
      );
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
      lastProgressUpdateRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
      audio.load();
    }

    audio.onended = () => {
      setPlayingIndex(null);
      lastProgressUpdateRef.current = 0;
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
    lastProgressUpdateRef.current = 0;
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
      lastProgressUpdateRef.current = 0;
    };
  }, []);

  // Format seconds into m:ss.
  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Seek within the audio preview by clicking the progress bar.
  const seekPreview = (
    index: number,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!audioRef.current || playingIndex !== index || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1,
    );
    const nextTime = ratio * duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  // Toggle filter panel visibility.
  const toggleFilters = () => setFiltersOpen((prev) => !prev);

  const totalPages = Math.max(1, Math.ceil(songs.length / RESULTS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const pageSongs = songs.slice(
    pageStartIndex,
    pageStartIndex + RESULTS_PER_PAGE,
  );

  return (
    <PageShell>
      <header className="relative z-10 text-center mb-10 sm:mb-12 w-full">
        <div className="inline-flex max-w-full items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl hover:border-[rgba(124,131,255,0.5)] transition-all hover:shadow-[0_0_30px_rgba(124,131,255,0.15)]">
          <Sparkles className="w-4 h-4 text-[var(--md-secondary)]" />
          <span className="text-[10px] sm:text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Creator Studio
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[var(--md-text)] mb-2 transition-all hover:tracking-[0.08em]">
          Trending Song Finder
        </h1>
        <p className="text-[var(--md-text-muted)] text-base max-w-2xl mx-auto">
          Find music that fits your edit, fast.
        </p>
        <div className="absolute -inset-x-6 -bottom-6 h-20 bg-[rgba(255,255,255,0.04)] blur-2xl -z-10" />
      </header>

      <section className="relative z-10 bg-[var(--md-surface-3)] p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-[var(--md-outline)] mb-10 sm:mb-12 backdrop-blur-2xl shadow-xl w-full">
        <form
          onSubmit={handleSearch}
          className="flex flex-col items-center gap-4 px-1 sm:px-2 py-4"
        >
          <div className="w-full max-w-2xl relative">
            <input
              list="category-options"
              placeholder="eg.. makeup, gym, travelling, road trip, cafe, restaurant etc."
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 sm:px-5 py-4 pr-14 rounded-[18px] focus:ring-2 focus:ring-[var(--md-primary)] outline-none transition-all placeholder:text-[color:var(--md-placeholder)] w-full text-sm sm:text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={toggleFilters}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] border border-[var(--md-outline)] transition-all active:scale-95 touch-manipulation"
              title={filtersOpen ? "Hide filters" : "Show filters"}
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
            >
              {filtersOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <SlidersHorizontal className="w-4 h-4" />
              )}
            </button>
            <datalist id="category-options">
              <option value="Pre wedding" />
              <option value="Makeup" />
              <option value="Food" />
              <option value="Travel vlog" />
              <option value="Road trip" />
              <option value="Religious" />
            </datalist>
          </div>

          <div
            id="filters-panel"
            className={`w-full max-w-3xl space-y-4 overflow-hidden transition-all ${
              filtersOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
            }`}
          >
            <FilterSection title="Feeling">
              {[
                "happy",
                "sad",
                "energetic",
                "romantic",
                "male",
                "female",
                "minimilistic",
                "golden hour",
              ].map((option) => {
                const active = formData.feeling === option;
                return (
                  <FilterButton
                    key={option}
                    active={active}
                    onClick={() =>
                      setFormData({ ...formData, feeling: option })
                    }
                  >
                    {option}
                  </FilterButton>
                );
              })}
            </FilterSection>

            <FilterSection title="Language">
              {["Hindi", "Punjabi", "English", "Pakistani", "Tamil"].map(
                (option) => {
                  const active = formData.language === option;
                  return (
                    <FilterButton
                      key={option}
                      active={active}
                      onClick={() =>
                        setFormData({ ...formData, language: option })
                      }
                    >
                      {option}
                    </FilterButton>
                  );
                },
              )}
            </FilterSection>

            <FilterSection title="Hashtag">
              {["viral", "trending", "classic", "old"].map((option) => {
                const active = formData.vibeTag === option;
                return (
                  <FilterButton
                    key={option}
                    active={active}
                    onClick={() =>
                      setFormData({ ...formData, vibeTag: option })
                    }
                  >
                    {option}
                  </FilterButton>
                );
              })}
            </FilterSection>

            <FilterSection title="Version">
              {["song", "remix"].map((option) => {
                const active = formData.version === option;
                return (
                  <FilterButton
                    key={option}
                    active={active}
                    onClick={() =>
                      setFormData({ ...formData, version: option })
                    }
                  >
                    {option}
                  </FilterButton>
                );
              })}
            </FilterSection>

            <FilterSection title="Depth">
              {["cinematic", "attitude", "aggressive", "soft"].map((tag) => {
                const active = formData.tags.includes(tag);
                return (
                  <FilterButton
                    key={tag}
                    active={active}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tags: active
                          ? prev.tags.filter((t) => t !== tag)
                          : [...prev.tags, tag],
                      }))
                    }
                  >
                    {tag}
                  </FilterButton>
                );
              })}
            </FilterSection>
          </div>

          <button
            disabled={loading}
            className="bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-lg px-7 sm:px-9 py-3 w-full sm:w-auto sm:self-center"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
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

      {loading && (
        <SongSearchLoadingState hint={LOADING_HINTS[loadingHintIndex]} />
      )}

      <div
        ref={resultsRef}
        className="relative z-10 grid gap-5 w-full min-w-0 max-w-full overflow-x-hidden"
      >
        {pageSongs.map((song, idx) => {
          const songIndex = pageStartIndex + idx;
          const indexLabel = songIndex + 1;
          return (
            <div
              key={`${song.title}-${songIndex}`}
              className={`group w-full min-w-0 max-w-full bg-[var(--md-surface-2)] border border-[var(--md-outline)] p-4 sm:p-5 rounded-[18px] sm:rounded-[22px] hover:border-[rgba(124,131,255,0.5)] transition-all flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-5 shadow-md sm:shadow-lg sm:backdrop-blur-md overflow-hidden sm:overflow-visible relative ${
                shareOpenIndex === songIndex ? "z-20" : "z-0"
              }`}
            >
              <div className="sm:hidden space-y-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="text-sm font-semibold text-[var(--md-text-muted)] w-6 text-center">
                    {indexLabel}
                  </div>
                  <div className="h-10 w-10 shrink-0 rounded-[12px] overflow-hidden bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                    {song.artworkUrl ? (
                      <Image
                        src={song.artworkUrl}
                        alt={`${song.title} thumbnail`}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <Music className="text-[var(--md-primary)] w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {song.title}
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
                  <div
                    className="flex-1 h-2 rounded-full bg-[var(--md-surface)] overflow-hidden border border-[var(--md-outline)] cursor-pointer"
                    onClick={(event) => seekPreview(songIndex, event)}
                    title={
                      playingIndex === songIndex
                        ? "Seek preview"
                        : "Play to enable seeking"
                    }
                  >
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 transition-[width] duration-150"
                      style={{
                        width:
                          playingIndex === songIndex && duration > 0
                            ? `${Math.min((currentTime / duration) * 100, 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => togglePreview(song, songIndex)}
                    disabled={!getPreviewUrl(song)}
                    className="shrink-0 bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] transition-all shadow-lg active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                    title={
                      audioErrorIndex === songIndex
                        ? "Preview failed to load"
                        : getPreviewUrl(song)
                          ? playingIndex === songIndex
                            ? "Pause preview"
                            : "Play preview"
                          : "Preview unavailable"
                    }
                  >
                    {playingIndex === songIndex ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setShareOpenIndex((prev) =>
                        prev === songIndex ? null : songIndex,
                      )
                    }
                    className="shrink-0 bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] transition-all shadow-lg active:scale-90 touch-manipulation"
                    title="Share song"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-[var(--md-text-muted)] font-semibold">
                  {song.tip}
                </div>
              </div>

              <div className="hidden sm:flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full min-w-0">
                <div className="text-base sm:text-lg font-semibold text-[var(--md-text-muted)] w-7 sm:w-10 text-center">
                  {indexLabel}
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[14px] sm:rounded-[18px] overflow-hidden bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center shrink-0">
                  {song.artworkUrl ? (
                    <Image
                      src={song.artworkUrl}
                      alt={`${song.title} thumbnail`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <Music className="text-[var(--md-primary)] w-6 h-6" />
                  )}
                </div>
                <div className="space-y-3 flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                    <h3 className="text-base sm:text-xl font-semibold tracking-tight truncate">
                      {song.title}
                    </h3>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-[var(--md-text-muted)] font-semibold tracking-wide">
                        <span>
                          {playingIndex === songIndex
                            ? formatTime(currentTime)
                            : "0:00"}
                        </span>
                        <span>
                          {playingIndex === songIndex
                            ? formatTime(duration)
                            : "0:00"}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-[var(--md-surface)] overflow-hidden border border-[var(--md-outline)] cursor-pointer"
                        onClick={(event) => seekPreview(songIndex, event)}
                        title={
                          playingIndex === songIndex
                            ? "Seek preview"
                            : "Play to enable seeking"
                        }
                      >
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 transition-[width] duration-150"
                          style={{
                            width:
                              playingIndex === songIndex && duration > 0
                                ? `${Math.min((currentTime / duration) * 100, 100)}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => togglePreview(song, songIndex)}
                      disabled={!getPreviewUrl(song)}
                      className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 sm:p-4 rounded-[14px] sm:rounded-[18px] transition-all shadow-xl active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
                      title={
                        audioErrorIndex === songIndex
                          ? "Preview failed to load"
                          : getPreviewUrl(song)
                            ? playingIndex === songIndex
                              ? "Pause preview"
                              : "Play preview"
                            : "Preview unavailable"
                      }
                    >
                      {playingIndex === songIndex ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-[var(--md-text-muted)] font-semibold">
                    {song.tip}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-4 min-w-fit w-full sm:w-auto justify-end relative">
                <button
                  onClick={() => copyRecipe(song, songIndex)}
                  className="relative bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:bg-[rgba(124,131,255,0.9)] p-3 sm:p-4 rounded-[16px] transition-all shadow-lg active:scale-90 overflow-hidden"
                  style={{
                    backgroundImage: getYoutubeThumbnail(song)
                      ? `linear-gradient(rgba(10,10,20,0.55), rgba(10,10,20,0.55)), url(${getYoutubeThumbnail(
                          song,
                        )})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  title="Copy Recipe"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() =>
                      setShareOpenIndex((prev) =>
                        prev === songIndex ? null : songIndex,
                      )
                    }
                    className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-3 sm:p-4 rounded-[16px] transition-all shadow-lg active:scale-90"
                    title="Share song"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  {shareOpenIndex === songIndex && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text)] shadow-xl backdrop-blur-xl p-2 z-[80]">
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          navigator.clipboard.writeText(link);
                          setCopiedIndex(songIndex);
                          setTimeout(() => setCopiedIndex(null), 2000);
                          setShareOpenIndex(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                      >
                        Copy YouTube link
                      </button>
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          const text = encodeURIComponent(
                            `${song.title} - ${link}`,
                          );
                          window.open(`https://wa.me/?text=${text}`, "_blank");
                          setShareOpenIndex(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                      >
                        Share on WhatsApp
                      </button>
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            link,
                          )}`;
                          window.open(shareUrl, "_blank");
                          setShareOpenIndex(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                      >
                        Share on Facebook
                      </button>
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          navigator.clipboard.writeText(link);
                          window.open("https://www.instagram.com/", "_blank");
                          setShareOpenIndex(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                      >
                        Share on Instagram
                      </button>
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          const body = encodeURIComponent(
                            `${song.title} - ${link}`,
                          );
                          window.open(`sms:?&body=${body}`, "_blank");
                          setShareOpenIndex(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                      >
                        Share via Message
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {shareOpenIndex === songIndex && (
                <div className="sm:hidden w-full mt-3 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text)] shadow-xl backdrop-blur-xl p-2">
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      navigator.clipboard.writeText(link);
                      setCopiedIndex(songIndex);
                      setTimeout(() => setCopiedIndex(null), 2000);
                      setShareOpenIndex(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                  >
                    Copy YouTube link
                  </button>
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      const text = encodeURIComponent(
                        `${song.title} - ${link}`,
                      );
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                      setShareOpenIndex(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                  >
                    Share on WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        link,
                      )}`;
                      window.open(shareUrl, "_blank");
                      setShareOpenIndex(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                  >
                    Share on Facebook
                  </button>
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      navigator.clipboard.writeText(link);
                      window.open("https://www.instagram.com/", "_blank");
                      setShareOpenIndex(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                  >
                    Share on Instagram
                  </button>
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      const body = encodeURIComponent(
                        `${song.title} - ${link}`,
                      );
                      window.open(`sms:?&body=${body}`, "_blank");
                      setShareOpenIndex(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] text-sm"
                  >
                    Share via Message
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {songs.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-[var(--md-surface-2)] hover:bg-[rgba(124,131,255,0.12)] text-[var(--md-text)] px-5 sm:px-6 py-3 rounded-full font-semibold tracking-[0.08em] sm:tracking-[0.18em] uppercase transition-all active:scale-95 border border-[var(--md-outline)] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-center text-sm font-semibold text-[var(--md-text-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage >= totalPages}
                className="bg-[var(--md-surface-2)] hover:bg-[rgba(124,131,255,0.12)] text-[var(--md-text)] px-5 sm:px-6 py-3 rounded-full font-semibold tracking-[0.08em] sm:tracking-[0.18em] uppercase transition-all active:scale-95 border border-[var(--md-outline)] disabled:opacity-40"
              >
                Next
              </button>
            </div>

            {currentPage >= totalPages && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mx-auto w-full sm:w-auto bg-[var(--md-primary)] text-[var(--md-on-primary)] px-6 py-3 rounded-full font-semibold tracking-[0.1em] sm:tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load New Songs"}
              </button>
            )}
          </div>
        )}

        {!loading && songs.length === 0 && !error && (
          <div className="text-center py-24 text-[var(--md-text-muted)] border border-[var(--md-outline)] rounded-[28px] bg-[var(--md-surface-2)] backdrop-blur-xl">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold">
              Ready to find your next hit?
            </p>
            <p className="text-sm mt-1">
              Fill the details and hit &quot;Search Song&quot;
            </p>
          </div>
        )}
      </div>

      <div className="mt-12 w-full">
        <TrendInsights limit={4} heading="Trending Songs Ideas" />
      </div>
    </PageShell>
  );
}

// Reusable filter group wrapper.
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.25em] text-[var(--md-text-muted)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Reusable pill button for filter options.
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] sm:tracking-[0.25em] transition-all ${
        active
          ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
          : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
      }`}
    >
      {children}
    </button>
  );
}

function SongSearchLoadingState({ hint }: { hint: string }) {
  return (
    <section className="relative z-10 mb-8 overflow-hidden rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-2xl sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--md-text-muted)] backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-[var(--md-primary)]" />
              AI Song Match In Progress
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[var(--md-text)] sm:text-2xl">
              Building your next set of reel-friendly songs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--md-text-muted)]">
              {hint}
            </p>
          </div>
          <div className="inline-flex items-center gap-3 self-start rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm text-[var(--md-text)] backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--md-primary)]" />
            <span className="font-medium">Analyzing trends</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Mood fit", "Fresh picks", "Edit timing"].map((label, index) => (
            <div
              key={label}
              className="rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
                  <Music className="h-3.5 w-3.5 text-[var(--md-secondary)]" />
                  {label}
                </div>
                <span className="text-[11px] text-[var(--md-text-muted)]">
                  0{index + 1}
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--md-surface-3)]" />
                <div className="h-3 w-full animate-pulse rounded-full bg-[var(--md-surface-3)]" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--md-surface-3)]" />
                <div className="pt-2">
                  <div className="h-10 animate-pulse rounded-[14px] bg-[linear-gradient(90deg,rgba(99,102,241,0.18),rgba(16,185,129,0.16),rgba(99,102,241,0.18))]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
