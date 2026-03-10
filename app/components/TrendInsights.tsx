"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  limit?: number;
  heading?: string;
  subheading?: string;
};

export default function TrendInsights({
  showCreate = false,
  showDelete = false,
  limit,
  heading = "Trend Insights",
  subheading = "Add market-based editing notes and psychology-driven cues to guide creators.",
}: TrendInsightsProps) {
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inspiration", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        setError(null);
      } else {
        setError("Failed to load insights.");
      }
    } catch {
      setError("Failed to load insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      await loadItems();
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
    } catch {
      setError("Failed to delete insight.");
    }
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
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold px-6 py-3 text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Publish Insight"}
          </button>
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
        <div className="grid gap-5 md:grid-cols-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[24px] p-5 backdrop-blur-xl shadow-lg flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)] mt-1">
                    {item.platforms}
                  </p>
                </div>
                {showDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-[12px] bg-[var(--md-surface)] border border-[var(--md-outline)] hover:bg-[rgba(255,100,100,0.12)] transition-all"
                    title="Delete insight"
                  >
                    <Trash2 className="w-4 h-4 text-red-300" />
                  </button>
                )}
              </div>

              {item.mediaDataUrl && (
                <img
                  src={item.mediaDataUrl}
                  alt={item.title}
                  className="w-full h-44 object-cover rounded-[18px] border border-[var(--md-outline)]"
                />
              )}

              <div className="text-sm text-[var(--md-text-muted)] space-y-3">
                <p>
                  <span className="font-semibold text-[var(--md-text)]">
                    Trend:
                  </span>{" "}
                  {item.trend}
                </p>
                <p>
                  <span className="font-semibold text-[var(--md-text)]">
                    Psychology:
                  </span>{" "}
                  {item.psychology}
                </p>
                <p>
                  <span className="font-semibold text-[var(--md-text)]">
                    Usage:
                  </span>{" "}
                  {item.usage}
                </p>
              </div>

              {item.mediaUrl && (
                <a
                  href={item.mediaUrl}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
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
