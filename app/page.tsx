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

// Main landing page component.
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
  const [visibleCount, setVisibleCount] = useState(2);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isTogglingRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shareOpenIndex, setShareOpenIndex] = useState<number | null>(null);
  const [excludeTitles, setExcludeTitles] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

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
    setLoading(true);
    setError(null);
    setSongs([]);
    setVisibleCount(2);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, excludeTitles, useAltKey: false }),
      });

      if (!res.ok) throw new Error("Failed to fetch from API");

      const data = await res.json();

      // Array check prevents .map() crashes if AI returns an object
      if (Array.isArray(data)) {
        const playable = data.filter((song: Song) => {
          const preview = getPreviewUrl(song);
          return typeof preview === "string" && preview.trim().length > 0;
        });
        setSongs(playable);
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
    } catch {
      setError("Connection error. Check your API key or internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, excludeTitles, useAltKey: true }),
      });
      if (!res.ok) throw new Error("Failed to fetch from API");
      const data = await res.json();
      if (Array.isArray(data)) {
        const playable = data.filter((song: Song) => {
          const preview = getPreviewUrl(song);
          return typeof preview === "string" && preview.trim().length > 0;
        });
        setSongs((prev) => [...prev, ...playable]);
        const titles = playable
          .map((song: Song) => String(song.title || "").trim())
          .filter((title: string) => title.length > 0);
        if (titles.length > 0) {
          const unique = Array.from(new Set([...excludeTitles, ...titles])).slice(0, 100);
          setExcludeTitles(unique);
          try {
            localStorage.setItem("ec_recent_titles", JSON.stringify(unique));
            localStorage.setItem("ec_recent_titles_at", String(Date.now()));
          } catch {
            // ignore storage errors
          }
        }
      }
    } catch {
      setError("Connection error. Check your API key or internet.");
    } finally {
      setLoadingMore(false);
    }
  };

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
      audio.addEventListener("timeupdate", () =>
        setCurrentTime(audio.currentTime || 0),
      );
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

  return (
    <PageShell>
      <header className="relative z-10 text-center mb-12 w-full">
        <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl hover:border-[rgba(124,131,255,0.5)] transition-all hover:shadow-[0_0_30px_rgba(124,131,255,0.15)]">
          <Sparkles className="w-4 h-4 text-[var(--md-secondary)]" />
          <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
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

      <section className="relative z-10 bg-[var(--md-surface-3)] p-5 sm:p-6 rounded-[28px] border border-[var(--md-outline)] mb-12 backdrop-blur-2xl shadow-xl w-full">
        <form
          onSubmit={handleSearch}
          className="flex flex-col items-center gap-4 px-1 sm:px-2 py-4"
        >
          <div className="w-full max-w-2xl relative">
            <input
              list="category-options"
              placeholder="eg.. makeup, gym, travelling, road trip, cafe, restaurant etc."
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-5 py-4 pr-14 rounded-[18px] focus:ring-2 focus:ring-[var(--md-primary)] outline-none transition-all placeholder:text-[color:var(--md-placeholder)] w-full text-base sm:text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={toggleFilters}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] border border-[var(--md-outline)] transition-all active:scale-95"
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
            className={`w-full max-w-3xl space-y-4 transition-all ${
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
              })}
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

      <div className="relative z-10 grid gap-5 w-full">
        {songs.slice(0, visibleCount).map((song, idx) => {
          const indexLabel = idx + 1;
          return (
            <div
              key={idx}
              className={`group bg-[var(--md-surface-2)] border border-[var(--md-outline)] p-4 sm:p-5 rounded-[18px] sm:rounded-[22px] hover:border-[rgba(124,131,255,0.5)] transition-all flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-5 backdrop-blur-xl shadow-lg overflow-visible relative ${
                shareOpenIndex === idx ? "z-20" : "z-0"
              }`}
            >
              <div className="sm:hidden space-y-2">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-[var(--md-text-muted)] w-6 text-center">
                    {indexLabel}
                  </div>
                  <div className="w-10 h-10 rounded-[12px] overflow-hidden bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center shrink-0">
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
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-2 rounded-full bg-[var(--md-surface)] overflow-hidden border border-[var(--md-outline)] cursor-pointer"
                    onClick={(event) => seekPreview(idx, event)}
                    title={
                      playingIndex === idx
                        ? "Seek preview"
                        : "Play to enable seeking"
                    }
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
                  <button
                    onClick={() => togglePreview(song, idx)}
                    disabled={!getPreviewUrl(song)}
                    className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] transition-all shadow-lg active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    {playingIndex === idx ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setShareOpenIndex((prev) => (prev === idx ? null : idx))
                    }
                    className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 rounded-[12px] transition-all shadow-lg active:scale-90"
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
                          {playingIndex === idx
                            ? formatTime(currentTime)
                            : "0:00"}
                        </span>
                        <span>
                          {playingIndex === idx ? formatTime(duration) : "0:00"}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-[var(--md-surface)] overflow-hidden border border-[var(--md-outline)] cursor-pointer"
                        onClick={(event) => seekPreview(idx, event)}
                        title={
                          playingIndex === idx
                            ? "Seek preview"
                            : "Play to enable seeking"
                        }
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
                      className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-2 sm:p-4 rounded-[14px] sm:rounded-[18px] transition-all shadow-xl active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
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
                      {playingIndex === idx ? (
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
                  onClick={() => copyRecipe(song, idx)}
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
                      setShareOpenIndex((prev) => (prev === idx ? null : idx))
                    }
                    className="bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-3 sm:p-4 rounded-[16px] transition-all shadow-lg active:scale-90"
                    title="Share song"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  {shareOpenIndex === idx && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text)] shadow-xl backdrop-blur-xl p-2 z-[80]">
                      <button
                        onClick={() => {
                          const link = getYoutubeLink(song);
                          navigator.clipboard.writeText(link);
                          setCopiedIndex(idx);
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
              {shareOpenIndex === idx && (
                <div className="sm:hidden w-full mt-3 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text)] shadow-xl backdrop-blur-xl p-2">
                  <button
                    onClick={() => {
                      const link = getYoutubeLink(song);
                      navigator.clipboard.writeText(link);
                      setCopiedIndex(idx);
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

        {songs.length > visibleCount && (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((prev) => Math.min(prev + 2, songs.length))
            }
            className="mx-auto bg-[var(--md-surface-2)] hover:bg-[rgba(124,131,255,0.12)] text-[var(--md-text)] px-6 py-3 rounded-full font-semibold tracking-[0.2em] uppercase transition-all active:scale-95 border border-[var(--md-outline)]"
          >
            More
          </button>
        )}

        {songs.length > 0 && visibleCount >= songs.length && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mx-auto bg-[var(--md-primary)] text-[var(--md-on-primary)] px-6 py-3 rounded-full font-semibold tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load New Songs"}
          </button>
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
        <TrendInsights
          limit={4}
          heading="What's Trending In The Market Now"
          subheading="Upload trend-based notes and psychology cues to guide edits."
        />
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
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
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
      className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all ${
        active
          ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-lg"
          : "bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.18)]"
      }`}
    >
      {children}
    </button>
  );
}
