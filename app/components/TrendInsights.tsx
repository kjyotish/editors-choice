"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { UploadCloud, Trash2, Link as LinkIcon } from "lucide-react";

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

const INSIGHTS_CACHE_TTL_MS = 10 * 60 * 1000;

type InsightsResponse = {
  items: Insight[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export default function TrendInsights({
  showCreate = false,
  showDelete = false,
  showEdit = false,
  limit,
  heading = "Trend Insights",
  subheading = "Add market-based editing notes and psychology-driven cues to guide creators.",
}: TrendInsightsProps) {
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const visibleItems = useMemo(() => {
    if (!limit) return items;
    return items.slice(0, limit);
  }, [items, limit]);

  const cacheKey = `ec_trend_insights_${limit || "all"}`;

  const loadItems = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(cacheKey);
        const cachedAt = window.localStorage.getItem(`${cacheKey}_at`);
        if (cached && cachedAt && Date.now() - Number(cachedAt) < INSIGHTS_CACHE_TTL_MS) {
          const parsed = JSON.parse(cached) as Insight[];
          if (Array.isArray(parsed)) {
            setItems(parsed);
            setError(null);
            setLoading(false);
            return;
          }
        }
      }

      const params = new URLSearchParams();
      if (limit) {
        params.set("limit", String(limit));
        params.set("offset", "0");
      }

      const res = await fetch(`/api/inspiration${params.size ? `?${params}` : ""}`, { signal });
      const data = await res.json();

      const nextItems = Array.isArray(data)
        ? data
        : Array.isArray((data as InsightsResponse)?.items)
          ? (data as InsightsResponse).items
          : null;

      if (nextItems) {
        setItems(nextItems);
        setError(null);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(cacheKey, JSON.stringify(nextItems));
          window.localStorage.setItem(`${cacheKey}_at`, String(Date.now()));
        }
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
  }, [limit]);

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

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
        mediaDataUrl?: string;
      } = {
        title: form.title.trim(),
        trend: form.trend.trim(),
        psychology: form.psychology.trim(),
        usage: form.usage.trim(),
        platforms: form.platforms.trim(),
        mediaUrl: form.mediaUrl.trim(),
      };
      if (form.mediaFile) {
        payload.mediaDataUrl = await toDataUrl(form.mediaFile);
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
      setEditingId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(cacheKey);
        window.localStorage.removeItem(`${cacheKey}_at`);
      }
      await loadItemsRef.current();
      setError(null);
    } catch {
      setError("Failed to save insight.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/inspiration?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(cacheKey);
        window.localStorage.removeItem(`${cacheKey}_at`);
      }
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
  };

  return (
    <section className="relative z-10 w-full">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-4 backdrop-blur-xl">
          <UploadCloud className="w-4 h-4 text-[var(--md-secondary)]" />
          <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
            {heading}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2">
          {heading}
        </h2>
        <p className="text-[var(--md-text-muted)] text-sm sm:text-base max-w-2xl mx-auto">
          {subheading}
        </p>
      </header>

      {showCreate && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[26px] p-5 sm:p-6 backdrop-blur-2xl shadow-xl mb-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Insight title (e.g., Bridal Glow Trend)"
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
            <input
              value={form.platforms}
              onChange={(e) => setForm({ ...form, platforms: e.target.value })}
              placeholder="Platforms (e.g., Reels, Shorts, TikTok)"
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <textarea
              value={form.trend}
              onChange={(e) => setForm({ ...form, trend: e.target.value })}
              placeholder="Market / social trend insight"
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] min-h-[110px]"
              required
            />
            <textarea
              value={form.psychology}
              onChange={(e) =>
                setForm({ ...form, psychology: e.target.value })
              }
              placeholder="Audience psychology / hook reason"
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] min-h-[110px]"
              required
            />
          </div>
          <textarea
            value={form.usage}
            onChange={(e) => setForm({ ...form, usage: e.target.value })}
            placeholder="How to use this song (cut points, pacing, tips)"
            className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] min-h-[110px] mt-4 w-full"
            required
          />
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <input
              value={form.mediaUrl}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              placeholder="Reference link (YouTube/Instagram/Drive)"
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            />
            <label className="flex items-center justify-between gap-3 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] cursor-pointer">
              <span className="text-xs text-[var(--md-text-muted)] uppercase tracking-[0.2em]">
                Upload cover image
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setForm({
                    ...form,
                    mediaFile: e.target.files?.[0] || null,
                  })
                }
              />
              <span className="text-[10px] text-[var(--md-text-muted)]">
                {form.mediaFile ? form.mediaFile.name : "No file"}
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold px-6 py-3 text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Update Insight" : "Publish Insight"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 py-3 rounded-full text-xs uppercase tracking-[0.25em] border border-[var(--md-outline)]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {error && (
        <div className="mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-[16px] p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-[var(--md-text-muted)] py-10">
          Loading insights...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-5 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--md-text)]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--md-text-muted)] mt-1">
                    {item.platforms}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {showEdit && (
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="text-xs px-3 py-1 rounded-[10px] border border-[var(--md-outline)] text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
                    >
                      Edit
                    </button>
                  )}
                  {showDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-[10px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] hover:bg-[rgba(255,100,100,0.12)] transition-all"
                      title="Delete insight"
                    >
                      <Trash2 className="w-4 h-4 text-red-300" />
                    </button>
                  )}
                </div>
              </div>

              {item.mediaDataUrl && (
                <div className="relative w-full h-44 rounded-[14px] border border-[var(--md-outline)] overflow-hidden">
                  <Image
                    src={item.mediaDataUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="text-sm text-[var(--md-text-muted)] space-y-3 leading-relaxed">
                <p>
                  <span className="text-[var(--md-text)] font-medium">Trend:</span>{" "}
                  {item.trend}
                </p>
                <p>
                  <span className="text-[var(--md-text)] font-medium">Psychology:</span>{" "}
                  {item.psychology}
                </p>
                <p>
                  <span className="text-[var(--md-text)] font-medium">Usage:</span>{" "}
                  {item.usage}
                </p>
              </div>

              {item.mediaUrl && (
                <a
                  href={item.mediaUrl}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon className="w-3 h-3" />
                  View reference
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
