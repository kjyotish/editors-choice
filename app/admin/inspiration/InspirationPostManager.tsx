"use client";

import React, { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Block, InspirationItem } from "./types";

type Props = {
  items: InspirationItem[];
  loading: boolean;
};

export default function InspirationPostManager({ items, loading }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockType, setBlockType] = useState<Block["type"]>("paragraph");
  const [blockText, setBlockText] = useState("");
  const [blockUrl, setBlockUrl] = useState("");
  const [blockCaption, setBlockCaption] = useState("");
  const [blockItems, setBlockItems] = useState("");
  const [blockJson, setBlockJson] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"created" | "updated" | "title" | "order">("created");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  const reload = () => {
    window.location.reload();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setSummary("");
    setKeywords("");
    setPublished(false);
    setSortOrder("");
    setBlocks([]);
    setBlockType("paragraph");
    setBlockText("");
    setBlockUrl("");
    setBlockCaption("");
    setBlockItems("");
    setBlockJson("");
  };

  const canAddBlock = useMemo(() => {
    if (blockType === "title" || blockType === "subtitle" || blockType === "paragraph") return blockText.trim().length > 0;
    if (blockType === "video" || blockType === "music" || blockType === "image" || blockType === "svg") return blockUrl.trim().length > 0;
    if (blockType === "chips" || blockType === "keywords") return blockItems.trim().length > 0;
    if (blockType === "custom") return blockJson.trim().length > 0;
    return false;
  }, [blockItems, blockJson, blockText, blockType, blockUrl]);

  const addBlock = () => {
    setError(null);
    if (!canAddBlock) return;

    if (blockType === "title" || blockType === "subtitle" || blockType === "paragraph") {
      setBlocks((prev) => [...prev, { type: blockType, text: blockText.trim() }]);
      setBlockText("");
      return;
    }

    if (blockType === "video" || blockType === "music" || blockType === "image" || blockType === "svg") {
      setBlocks((prev) => [...prev, { type: blockType, url: blockUrl.trim(), caption: blockCaption.trim() || undefined }]);
      setBlockUrl("");
      setBlockCaption("");
      return;
    }

    if (blockType === "chips" || blockType === "keywords") {
      const nextItems = blockItems.split(",").map((item) => item.trim()).filter(Boolean);
      setBlocks((prev) => [...prev, { type: blockType, items: nextItems }]);
      setBlockItems("");
      return;
    }

    try {
      const data = JSON.parse(blockJson) as Record<string, unknown>;
      setBlocks((prev) => [...prev, { type: "custom", data }]);
      setBlockJson("");
    } catch {
      setError("Custom JSON is invalid.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const nextKeywords = Array.from(new Set(keywords.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean)));
      if (!title.trim()) throw new Error("Title is required.");
      if (published && nextKeywords.length === 0) throw new Error("Keywords are required before publishing.");

      const payload = {
        id: editingId || undefined,
        title: title.trim(),
        subtitle: subtitle.trim(),
        summary: summary.trim(),
        blocks,
        keywords: nextKeywords,
        published,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      };

      const res = await fetch("/api/inspiration-content", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save inspiration post.");
      }

      resetForm();
      reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save inspiration post.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: InspirationItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setSubtitle(item.subtitle || "");
    setSummary(item.summary || "");
    setKeywords(Array.isArray(item.keywords) ? item.keywords.join(", ") : "");
    setPublished(Boolean(item.published));
    setSortOrder(item.sort_order !== null ? String(item.sort_order) : "");
    setBlocks(Array.isArray(item.blocks) ? item.blocks : []);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inspiration-content?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete inspiration post.");
      if (editingId === id) resetForm();
      reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete inspiration post.");
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = items.slice();
    if (needle) {
      list = list.filter((item) => [item.title, item.subtitle || "", item.summary || ""].join(" ").toLowerCase().includes(needle));
    }
    if (statusFilter !== "all") {
      list = list.filter((item) => (statusFilter === "published" ? item.published : !item.published));
    }
    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "order") return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      if (sortBy === "updated") {
        const aDate = a.updated_at || a.created_at;
        const bDate = b.updated_at || b.created_at;
        return bDate.localeCompare(aDate);
      }
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [items, query, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  const getBlockPreview = (block: Block) => {
    if (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") return block.text;
    if (block.type === "chips" || block.type === "keywords") return block.items.join(", ");
    if (block.type === "custom") return JSON.stringify(block.data);
    if (block.type === "video" || block.type === "music" || block.type === "image" || block.type === "svg") return block.url;
    return "";
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <>
      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Inspiration Content</h1>
        <p className="mb-6 mt-2 text-sm text-[var(--md-text-muted)]">Manage long-form inspiration posts for the public library.</p>

        {error && <div className="mb-4 rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
          <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Subtitle" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
        </div>

        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Summary / short paragraph" className="mt-4 min-h-[90px] w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
        <input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Keywords (comma-separated, required before publishing)" className="mt-4 w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />

        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--md-text-muted)]"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />Published</label>
          <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} placeholder="Sort order (optional)" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm outline-none sm:w-44" />
        </div>

        <div className="mt-6 border-t border-[var(--md-outline)] pt-5">
          <div className="mb-3 text-sm font-semibold">Blocks</div>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <div className="w-full sm:hidden">
              <div className="mb-2 text-xs text-[var(--md-text-muted)]">Block Type</div>
              <div className="grid grid-cols-2 gap-2">
                {["title", "subtitle", "paragraph", "video", "music", "image", "svg", "chips", "keywords", "custom"].map((option) => (
                  <button key={option} type="button" onClick={() => setBlockType(option as Block["type"])} className={blockType === option ? "rounded-[10px] border border-transparent bg-[var(--md-primary)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--md-on-primary)]" : "rounded-[10px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)]"}>{option}</button>
                ))}
              </div>
            </div>

            <select value={blockType} onChange={(event) => setBlockType(event.target.value as Block["type"])} className="hidden w-56 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:block">
              <option value="title">Title</option>
              <option value="subtitle">Subtitle</option>
              <option value="paragraph">Paragraph</option>
              <option value="video">Video</option>
              <option value="music">Music</option>
              <option value="image">Image</option>
              <option value="svg">SVG</option>
              <option value="chips">Chips</option>
              <option value="keywords">Keywords</option>
              <option value="custom">Custom JSON</option>
            </select>

            {(blockType === "title" || blockType === "subtitle" || blockType === "paragraph") && <input value={blockText} onChange={(event) => setBlockText(event.target.value)} placeholder="Text" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[240px] sm:flex-1" />}
            {(blockType === "video" || blockType === "music" || blockType === "image" || blockType === "svg") && <><input value={blockUrl} onChange={(event) => setBlockUrl(event.target.value)} placeholder="Media URL" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[220px] sm:flex-1" /><input value={blockCaption} onChange={(event) => setBlockCaption(event.target.value)} placeholder="Caption (optional)" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[200px] sm:flex-1" /></>}
            {(blockType === "chips" || blockType === "keywords") && <input value={blockItems} onChange={(event) => setBlockItems(event.target.value)} placeholder="Comma-separated items" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[240px] sm:flex-1" />}
            {blockType === "custom" && <input value={blockJson} onChange={(event) => setBlockJson(event.target.value)} placeholder='Custom JSON (e.g. {"type":"quote","text":"..."})' className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[260px] sm:flex-1" />}
            <button type="button" onClick={addBlock} disabled={!canAddBlock} className="w-full rounded-[12px] bg-[var(--md-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-on-primary)] disabled:opacity-50 sm:w-auto">Add</button>
          </div>

          {blocks.length > 0 && (
            <div className="mt-4 grid gap-2">
              {blocks.map((block, index) => (
                <div key={`${block.type}-${index}`} className="flex flex-col justify-between gap-3 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-xs sm:flex-row sm:items-center">
                  <div className="text-[var(--md-text-muted)]"><span className="font-semibold text-[var(--md-text)]">{block.type}</span>{" "}{getBlockPreview(block)}</div>
                  <button type="button" onClick={() => setBlocks((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="self-start text-red-300 hover:text-red-200 sm:self-auto">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" onClick={handleSave} disabled={saving || !title.trim()} className="w-full rounded-[14px] bg-[var(--md-primary)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-on-primary)] disabled:opacity-50 sm:w-auto">{saving ? "Saving..." : editingId ? "Update Post" : "Publish Post"}</button>
            <button type="button" onClick={resetForm} className="w-full rounded-[14px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] sm:w-auto">Clear</button>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inspiration Posts</h2>
          <span className="text-xs text-[var(--md-text-muted)]">{filtered.length} items</span>
        </div>

        <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search title or summary" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:min-w-[220px] sm:flex-1" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "all" | "published" | "draft"); setPage(1); }} className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:w-auto"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option></select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:w-auto"><option value="created">Newest</option><option value="updated">Recently Updated</option><option value="title">Title</option><option value="order">Sort Order</option></select>
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm sm:w-auto"><option value={6}>6 / page</option><option value={8}>8 / page</option><option value={12}>12 / page</option></select>
        </div>

        {loading ? <div className="text-sm text-[var(--md-text-muted)]">Loading...</div> : (
          <div className="grid gap-3">
            {pageItems.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-4 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={item.published ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300" : "rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300"}>{item.published ? "Published" : "Draft"}</span>
                    {item.sort_order !== null && <span className="rounded-full border border-[var(--md-outline)] px-2 py-0.5 text-[11px] text-[var(--md-text-muted)]">Order {item.sort_order}</span>}
                  </div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-[var(--md-text-muted)]">{item.subtitle || "No subtitle"}</div>
                  {Array.isArray(item.keywords) && item.keywords.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{item.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-[var(--md-outline)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--md-text-muted)]">{keyword}</span>)}</div>}
                  <div className="mt-2 text-[11px] text-[var(--md-text-muted)]">{item.view_count.toLocaleString()} views</div>
                  <div className="mt-1 text-[11px] text-[var(--md-text-muted)]">Created {formatDate(item.created_at)}{item.updated_at ? ` | Updated ${formatDate(item.updated_at)}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleEdit(item)} className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 text-xs">Edit</button>
                  <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-[10px] border border-[var(--md-outline)] p-2 text-red-300 hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > pageSize && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--md-text-muted)]">
            <span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 disabled:opacity-50">Prev</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

