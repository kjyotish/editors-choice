"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, PencilLine, Share2, Sparkles, Trash2, Film } from "lucide-react";
import {
  clampSongRating,
  getSongCategoryLabel,
  getYouTubeEmbedUrl,
  songCategories,
  type SongItem,
} from "@/app/songs/songTypes";

type Props = {
  items: SongItem[];
  loading: boolean;
};

type SongFormState = {
  title: string;
  artistName: string;
  category: string;
  rating: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  searchTerms: string;
  sortOrder: string;
  published: boolean;
};

const emptyForm = (): SongFormState => ({
  title: "",
  artistName: "",
  category: songCategories[0]?.key ?? "travel",
  rating: "5",
  youtubeUrl: "",
  thumbnailUrl: "",
  searchTerms: "",
  sortOrder: "",
  published: true,
});

export default function SongManager({ items, loading }: Props) {
  const [form, setForm] = useState<SongFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [
        item.title,
        item.artist_name ?? "",
        item.category,
        item.search_text,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  };

  const handleEdit = (item: SongItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      artistName: item.artist_name || "",
      category: item.category,
      rating: String(item.rating ?? 5),
      youtubeUrl: item.youtube_url,
      thumbnailUrl: item.thumbnail_url || "",
      searchTerms: item.search_text,
      sortOrder: item.sort_order !== null ? String(item.sort_order) : "",
      published: item.published,
    });
    setError(null);
  };

  const saveSong = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!form.title.trim()) throw new Error("Song title is required.");
      if (!form.category.trim()) throw new Error("Category is required.");
      const rating = clampSongRating(Number(form.rating || 5));
      if (!form.youtubeUrl.trim()) throw new Error("YouTube URL is required.");

      const payload = {
        id: editingId || undefined,
        title: form.title.trim(),
        artistName: form.artistName.trim(),
        category: form.category.trim().toLowerCase(),
        rating,
        youtubeUrl: form.youtubeUrl.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        searchTerms: form.searchTerms.trim() || null,
        published: form.published,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      };

      const res = await fetch("/api/songs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save song.");
      }

      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save song.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSong = async (id: string) => {
    try {
      const res = await fetch(`/api/songs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete song.");
      if (editingId === id) resetForm();
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete song.");
    }
  };

  const copyLink = async (item: SongItem) => {
    try {
      await navigator.clipboard.writeText(item.youtube_url);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1600);
    } catch {
      setError("Copy failed. Please try again.");
    }
  };

  const shareSong = async (item: SongItem) => {
    const shareText = `${item.title}${item.artist_name ? ` - ${item.artist_name}` : ""}\n${item.youtube_url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: item.youtube_url,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
    } catch {
      setError("Share failed. Please try again.");
    }
  };

  const songGroups = useMemo(() => {
    const grouped = songCategories.reduce<Record<string, SongItem[]>>((acc, category) => {
      acc[category.key] = [];
      return acc;
    }, {});

    filteredItems.forEach((item) => {
      const key = grouped[item.category] ? item.category : "travel";
      grouped[key].push(item);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((left, right) => {
        const ratingDelta = (right.rating ?? 5) - (left.rating ?? 5);
        if (ratingDelta !== 0) return ratingDelta;

        const sortDelta =
          (left.sort_order ?? Number.POSITIVE_INFINITY) -
          (right.sort_order ?? Number.POSITIVE_INFINITY);
        if (sortDelta !== 0) return sortDelta;

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
    });

    return grouped;
  }, [filteredItems]);

  return (
    <section className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            <Sparkles className="h-4 w-4 text-[var(--md-primary)]" />
            Song Upload
          </div>
          <h2 className="text-lg font-semibold">Dashboard Song Panel</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--md-text-muted)]">
            Add a title, artist, category, and YouTube link. Songs stay hidden from the public UI
            until someone searches for them.
          </p>
        </div>
        <span className="text-xs text-[var(--md-text-muted)]">{items.length} saved</span>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--md-text-muted)]">Song Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
                placeholder="Aaj Ki Raat"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--md-text-muted)]">Artist Name</span>
              <input
                value={form.artistName}
                onChange={(event) => setForm((current) => ({ ...current, artistName: event.target.value }))}
                className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
                placeholder="Artist"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--md-text-muted)]">Category</span>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
              >
                {songCategories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--md-text-muted)]">Sort Order</span>
              <input
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
                placeholder="1"
                inputMode="numeric"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-[var(--md-text-muted)]">Rating</span>
            <input
              type="number"
              min={1}
              max={10}
              value={form.rating}
              onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
              className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
              placeholder="5"
            />
            <p className="text-xs text-[var(--md-text-muted)]">
              Higher ratings appear first in search results.
            </p>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-[var(--md-text-muted)]">YouTube URL</span>
            <input
              value={form.youtubeUrl}
              onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
              className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-[var(--md-text-muted)]">Thumbnail URL Optional</span>
            <input
              value={form.thumbnailUrl}
              onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
              className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
              placeholder="Thumbnail image url"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-[var(--md-text-muted)]">Search Terms Optional</span>
            <textarea
              value={form.searchTerms}
              onChange={(event) => setForm((current) => ({ ...current, searchTerms: event.target.value }))}
              className="min-h-24 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 outline-none"
              placeholder="Add extra searchable words like wedding, slow motion, sunset, reel"
            />
          </label>

          <label className="inline-flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              className="h-4 w-4"
            />
            Publish immediately
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveSong()}
              disabled={saving}
              className="rounded-full bg-[var(--md-primary)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-on-primary)] transition-all hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Song" : "Save Song"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[var(--md-outline)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Public Preview</div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
              {getSongCategoryLabel(form.category)}
            </div>
          </div>
          <div className="aspect-video overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)]">
            {form.youtubeUrl.trim() ? (
              <iframe
                src={getYouTubeEmbedUrl(form.youtubeUrl)}
                title="Song preview"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-[var(--md-text-muted)]">
                Preview appears here after you add a YouTube link.
              </div>
            )}
          </div>
          <p className="text-sm leading-7 text-[var(--md-text-muted)]">
            This panel is built to scale: each row stays in Supabase, search terms are normalized
            once on save, and public search only fetches matching published songs.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <label className="w-full max-w-md space-y-2 text-sm">
          <span className="text-[var(--md-text-muted)]">Filter saved songs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 outline-none"
            placeholder="Search title, artist, or category"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5">
        {Object.entries(songGroups).map(([categoryKey, categoryItems]) => {
          if (categoryItems.length === 0) return null;
          const category = songCategories.find((item) => item.key === categoryKey);

          return (
            <section key={categoryKey} className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{category?.label ?? categoryKey}</h3>
                  <p className="text-sm text-[var(--md-text-muted)]">{category?.description}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
                  {categoryItems.length} songs
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {categoryItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                          <Film className="h-3.5 w-3.5 text-[var(--md-primary)]" />
                          {getSongCategoryLabel(item.category)}
                        </div>
                        <h4 className="mt-3 text-lg font-semibold text-[var(--md-text)]">{item.title}</h4>
                        {item.artist_name ? (
                          <p className="mt-1 text-sm text-[var(--md-text-muted)]">{item.artist_name}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                          Rating {item.rating ?? 5}/10
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-full border border-[var(--md-outline)] p-2 text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                          title="Edit"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSong(item.id)}
                          className="rounded-full border border-[var(--md-outline)] p-2 text-[var(--md-text-muted)] transition-colors hover:border-red-500 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--md-outline)]">
                      <iframe
                        src={item.youtube_embed_url}
                        title={`${item.title} preview`}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyLink(item)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                      >
                        {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedId === item.id ? "Copied" : "Copy Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareSong(item)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </button>
                      <span className="inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
                        {item.published ? "Published" : "Hidden"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-5 py-6 text-sm text-[var(--md-text-muted)]">
            No songs saved yet. Add the first song above to publish it on the public search page.
          </div>
        )}
      </div>
    </section>
  );
}
