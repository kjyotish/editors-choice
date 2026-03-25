"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { Download, Link as LinkIcon, Pause, Play, Share2, Trash2, UploadCloud } from "lucide-react";
import { uploadFileToCloudinary } from "../admin/mediaUpload";

type Insight = {
  id: string;
  title: string;
  trend: string;
  psychology: string;
  usage: string;
  platforms: string;
  mediaUrl?: string;
  mediaDataUrl?: string;
  createdAt: string;
};

type TrendInsightsProps = {
  showCreate?: boolean;
  showDelete?: boolean;
  showEdit?: boolean;
  limit?: number;
  heading?: string;
  subheading?: string;
};

type InsightsResponse = {
  items: Insight[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

const isCloudinaryMedia = (value?: string, resourceType?: "image" | "video") => {
  if (!value) return false;
  const normalized = normalizeMediaUrl(value);
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes("res.cloudinary.com")) return false;
    if (!resourceType) return /\/(?:image|video)\/upload\//i.test(parsed.pathname);
    return new RegExp(`/${resourceType}/upload/`, "i").test(parsed.pathname);
  } catch {
    return false;
  }
};
const isVideoSource = (value?: string) => {
  if (!value) return false;
  const normalized = normalizeMediaUrl(value);
  return (
    normalized.startsWith("data:video/") ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(normalized) ||
    isCloudinaryMedia(normalized, "video")
  );
};

const isImageSource = (value?: string) => {
  if (!value) return false;
  const normalized = normalizeMediaUrl(value);
  return (
    normalized.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(normalized) ||
    isCloudinaryMedia(normalized, "image")
  );
};

const isAudioSource = (value?: string) => {
  if (!value) return false;
  return (
    value.startsWith("data:audio/") ||
    /\.(mp3|wav|aac|m4a|ogg|flac)(\?.*)?$/i.test(value)
  );
};

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|youtu\.be|youtube\.com|vimeo\.com|drive\.google\.com|res\.cloudinary\.com|cloudinary\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "insight-media";

const getFileExtension = (url: string, fallback: string) => {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);/i);
    const mime = match?.[1]?.toLowerCase() || "";
    if (mime.includes("png")) return ".png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
    if (mime.includes("webp")) return ".webp";
    if (mime.includes("gif")) return ".gif";
    if (mime.includes("svg")) return ".svg";
    if (mime.includes("mp4")) return ".mp4";
    if (mime.includes("webm")) return ".webm";
    if (mime.includes("ogg")) return ".ogg";
    if (mime.includes("mpeg") || mime.includes("mp3")) return ".mp3";
    if (mime.includes("wav")) return ".wav";
    if (mime.includes("aac")) return ".aac";
    if (mime.includes("m4a")) return ".m4a";
    if (mime.includes("flac")) return ".flac";
    return fallback;
  }

  try {
    const pathname = new URL(normalizeMediaUrl(url)).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1] ? `.${match[1].toLowerCase()}` : fallback;
  } catch {
    return fallback;
  }
};

const getInsightDownloadFilename = (title: string, source: string) => {
  const fallback = isAudioSource(source) ? ".mp3" : isVideoSource(source) ? ".mp4" : ".jpg";
  return `${slugify(title)}${getFileExtension(source, fallback)}`;
};

const buildProtectedDownloadHref = (url: string, filename: string) =>
  `/api/media-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

function InsightVideoPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--md-outline)] bg-black">
      <div className="relative">
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate nofullscreen"
          onClick={() => void togglePlayback()}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onContextMenu={(event) => event.preventDefault()}
          src={src}
          className="block max-h-[28rem] w-full object-contain"
          aria-label={title}
        />
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
        </button>
      </div>
    </div>
  );
}
export default function TrendInsights({
  showCreate = false,
  showDelete = false,
  showEdit = false,
  limit,
  heading = "Trend Insights",
  subheading = "Market-based editing notes and psychology cues to guide creators.",
}: TrendInsightsProps) {
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [sharedInsightId, setSharedInsightId] = useState("");
  const loadItemsRef = React.useRef<(signal?: AbortSignal) => Promise<void>>(async () => {});
  const [form, setForm] = useState({
    title: "",
    trend: "",
    psychology: "",
    usage: "",
    platforms: "",
    mediaUrl: "",
    mediaFile: null as File | null,
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);

  const visibleItems = useMemo(() => {
    if (!limit) return items;
    return items.slice(0, limit);
  }, [items, limit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSharedInsightId(params.get("insight") || "");
  }, []);

  const loadItems = async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (limit) {
        params.set("limit", String(limit));
        params.set("offset", "0");
      }

      const [listRes, sharedRes] = await Promise.all([
        fetch(`/api/inspiration${params.size ? `?${params}` : ""}`, { signal, cache: "no-store" }),
        sharedInsightId
          ? fetch(`/api/inspiration?id=${encodeURIComponent(sharedInsightId)}`, { signal, cache: "no-store" })
          : Promise.resolve(null),
      ]);
      const data = await listRes.json();
      const sharedItem = sharedRes && sharedRes.ok ? ((await sharedRes.json()) as Insight) : null;

      const nextItems = Array.isArray(data)
        ? data
        : Array.isArray((data as InsightsResponse)?.items)
          ? (data as InsightsResponse).items
          : null;

      if (nextItems) {
        const mergedItems = sharedItem
          ? [sharedItem, ...nextItems.filter((item) => item.id !== sharedItem.id)]
          : nextItems;
        setItems(mergedItems);
        setError(null);
      } else {
        setError("Failed to load insights.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setError("Failed to load insights.");
    } finally {
      setLoading(false);
    }
  };

  loadItemsRef.current = loadItems;

  useEffect(() => {
    const controller = new AbortController();
    void loadItemsRef.current(controller.signal);
    return () => controller.abort();
  }, [limit, sharedInsightId]);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);
  useEffect(() => {
    if (!form.mediaFile) {
      setMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(form.mediaFile);
    setMediaPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [form.mediaFile]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload: {
        title: string;
        trend: string;
        psychology: string;
        usage: string;
        platforms: string;
        mediaUrl?: string;
      } = {
        title: form.title.trim(),
        trend: form.trend.trim(),
        psychology: form.psychology.trim(),
        usage: form.usage.trim(),
        platforms: form.platforms.trim(),
        mediaUrl: form.mediaUrl.trim(),
      };

      if (form.mediaFile) {
        setUploadingMedia(true);
        setUploadProgress(0);
        const kind = form.mediaFile.type.startsWith("video/") ? "video" : "image";
        const upload = await uploadFileToCloudinary({
          file: form.mediaFile,
          kind,
          onProgress: setUploadProgress,
        });

        if (!upload.secureUrl) {
          throw new Error(upload.error || "Failed to upload insight media.");
        }

        payload.mediaUrl = upload.secureUrl;
      }

      const res = await fetch("/api/inspiration", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingId || undefined }),
      });
      if (!res.ok) {
        throw new Error("Failed to save insight.");
      }
      setForm({
        title: "",
        trend: "",
        psychology: "",
        usage: "",
        platforms: "",
        mediaUrl: "",
        mediaFile: null,
      });
      setUploadProgress(0);
      setEditingId(null);
      await loadItemsRef.current();
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save insight.");
    } finally {
      setUploadingMedia(false);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/inspiration?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Failed to delete insight.");
    }
  };

  const handleEdit = (item: Insight) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      trend: item.trend || "",
      psychology: item.psychology || "",
      usage: item.usage || "",
      platforms: item.platforms || "",
      mediaUrl: item.mediaUrl || "",
      mediaFile: null,
    });
    setUploadProgress(0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      title: "",
      trend: "",
      psychology: "",
      usage: "",
      platforms: "",
      mediaUrl: "",
      mediaFile: null,
    });
    setUploadProgress(0);
  };

  const currentPreview = mediaPreviewUrl || normalizeMediaUrl(form.mediaUrl);

  const shareInsight = async (item: Insight) => {
    if (typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}/?insight=${encodeURIComponent(item.id)}#trend-insight-${item.id}`;
    const text = `${item.title} - ${item.platforms}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(`${text} ${shareUrl}`.trim());
    } catch {
      // Ignore canceled shares and clipboard failures.
    }
  };
  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0 || !window.location.hash) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [items]);

  const startDownload = (item: Insight) => {
    const source = item.mediaDataUrl || item.mediaUrl;
    if (!source || typeof window === "undefined") return;

    if (!hasSession) {
      window.location.href = `/login?redirectTo=${encodeURIComponent("/")}`;
      return;
    }

    const filename = getInsightDownloadFilename(item.title, source);
    const link = document.createElement("a");

    if (source.startsWith("data:")) {
      link.href = source;
      link.download = filename;
    } else {
      const normalized = normalizeMediaUrl(source);
      const resolvedUrl = normalized.startsWith("/")
        ? `${window.location.origin}${normalized}`
        : normalized;
      link.href = buildProtectedDownloadHref(resolvedUrl, filename);
      link.rel = "noopener noreferrer";
    }

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="relative z-10 w-full">
      <header className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 backdrop-blur-xl">
          <UploadCloud className="h-4 w-4 text-[var(--md-secondary)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
            {heading}
          </span>
        </div>
        <h2 className="mb-2 text-2xl font-semibold sm:text-3xl md:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-[var(--md-text-muted)] sm:text-base">
          {subheading}
        </p>
      </header>

      {showCreate && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-5 shadow-xl backdrop-blur-2xl sm:p-6"
        >
          <div className="columns-1 gap-4 md:columns-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Insight title (e.g., Bridal Glow Trend)"
              className="rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
            <input
              value={form.platforms}
              onChange={(e) => setForm({ ...form, platforms: e.target.value })}
              placeholder="Platforms (e.g., Reels, Shorts, TikTok)"
              className="rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <textarea
              value={form.trend}
              onChange={(e) => setForm({ ...form, trend: e.target.value })}
              placeholder="Market / social trend insight"
              className="min-h-[110px] rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
            <textarea
              value={form.psychology}
              onChange={(e) =>
                setForm({ ...form, psychology: e.target.value })
              }
              placeholder="Audience psychology / hook reason"
              className="min-h-[110px] rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
          </div>
          <textarea
            value={form.usage}
            onChange={(e) => setForm({ ...form, usage: e.target.value })}
            placeholder="How to use this song (cut points, pacing, tips)"
            className="mt-4 min-h-[110px] w-full rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            required
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={form.mediaUrl}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              placeholder="Cloudinary or external media URL"
              className="rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
                Upload to Cloudinary
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) =>
                  setForm({
                    ...form,
                    mediaFile: e.target.files?.[0] || null,
                  })
                }
              />
              <span className="text-[10px] text-[var(--md-text-muted)]">
                {form.mediaFile ? "File selected" : "Choose file"}
              </span>
            </label>
          </div>
          {form.mediaFile && (
            <div className="mt-4 rounded-[16px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 text-xs text-[var(--md-text-muted)]">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{"Selected file"}</span>
                <span>{Math.max(1, Math.round(form.mediaFile.size / 1024))} KB</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[var(--md-primary)] transition-all"
                  style={{ width: `${uploadingMedia ? uploadProgress : 0}%` }}
                />
              </div>
              <div className="mt-2">
                {uploadingMedia ? `Uploading to Cloudinary: ${uploadProgress}%` : "Ready to upload on publish"}
              </div>
            </div>
          )}
          {currentPreview && (isVideoSource(currentPreview) || isImageSource(currentPreview)) && (
            <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
              {isVideoSource(currentPreview) ? (
                <video
                  src={currentPreview}
                  controls
                  playsInline
                  preload="metadata"
                  className="block max-h-[28rem] w-full object-contain bg-black"
                />
              ) : (
                <div className="relative h-56 w-full">
                  <Image
                    src={currentPreview}
                    alt={form.title || "Insight media preview"}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="border-t border-[var(--md-outline)] px-3 py-2 text-xs text-[var(--md-text-muted)]">
                {form.mediaFile ? "Local preview before upload" : "Current saved media"}
              </div>
            </div>
          )}          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting || uploadingMedia}
              className="rounded-full bg-[var(--md-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-on-primary)] transition-all active:scale-95 disabled:opacity-60"
            >
              {submitting || uploadingMedia ? "Saving..." : editingId ? "Update Insight" : "Publish Insight"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-[var(--md-outline)] px-5 py-3 text-xs uppercase tracking-[0.25em]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {error && (
        <div className="mb-6 rounded-[16px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-[var(--md-text-muted)]">
          Loading insights...
        </div>
      ) : (
        <div className="columns-1 gap-4 md:columns-2">
          {visibleItems.map((item) => {
            const mediaSource = item.mediaDataUrl || item.mediaUrl;
            const canDownload = Boolean(
              mediaSource && (isImageSource(mediaSource) || isVideoSource(mediaSource) || isAudioSource(mediaSource))
            );

            return (
              <div
                id={`trend-insight-${item.id}`}
                key={item.id}
                className="mb-4 inline-flex w-full break-inside-avoid flex-col gap-4 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--md-text)] sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--md-text-muted)]">
                      {item.platforms}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {showEdit && (
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 text-xs text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
                      >
                        Edit
                      </button>
                    )}
                    {showDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-[10px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-2 transition-all hover:bg-[rgba(255,100,100,0.12)]"
                        title="Delete insight"
                      >
                        <Trash2 className="h-4 w-4 text-red-300" />
                      </button>
                    )}
                  </div>
                </div>

                {item.mediaDataUrl && isImageSource(item.mediaDataUrl) && (
                  <div className="relative h-44 w-full overflow-hidden rounded-[14px] border border-[var(--md-outline)]">
                    <Image
                      src={item.mediaDataUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}

                {item.mediaDataUrl && isVideoSource(item.mediaDataUrl) && (
                  <InsightVideoPlayer src={item.mediaDataUrl} title={item.title} />
                )}

                {!item.mediaDataUrl && item.mediaUrl && isVideoSource(item.mediaUrl) && (
                  <InsightVideoPlayer src={normalizeMediaUrl(item.mediaUrl)} title={item.title} />
                )}

                {!item.mediaDataUrl && item.mediaUrl && isImageSource(item.mediaUrl) && (
                  <div className="relative h-44 w-full overflow-hidden rounded-[14px] border border-[var(--md-outline)]">
                    <Image
                      src={normalizeMediaUrl(item.mediaUrl)}
                      alt={item.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="space-y-3 text-sm leading-relaxed text-[var(--md-text-muted)]">
                  <p>
                    <span className="font-medium text-[var(--md-text)]">Trend:</span>{" "}
                    {item.trend}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--md-text)]">Psychology:</span>{" "}
                    {item.psychology}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--md-text)]">Usage:</span>{" "}
                    {item.usage}
                  </p>
                </div>

                {(item.mediaUrl || canDownload) && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    {item.mediaUrl ? (
                      <a
                        href={item.mediaUrl}
                        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkIcon className="h-3 w-3" />
                        View reference
                      </a>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {canDownload && (
                        <div className="group relative">
                          <button
                            type="button"
                            onClick={() => startDownload(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text-muted)] transition-all hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                            aria-label={hasSession ? "Download media" : "Sign in to download media"}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max max-w-[12rem] rounded-[10px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] px-3 py-2 text-[11px] font-medium text-[var(--md-text)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                            {hasSession ? "Download media" : "Sign in to download"}
                          </div>
                        </div>
                      )}
                      <div className="group relative">
                        <button
                          type="button"
                          onClick={() => void shareInsight(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text-muted)] transition-all hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                          aria-label="Share insight"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max max-w-[12rem] rounded-[10px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] px-3 py-2 text-[11px] font-medium text-[var(--md-text)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                          Share insight
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}















