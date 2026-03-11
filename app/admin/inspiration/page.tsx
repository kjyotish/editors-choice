"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "../../components/PageShell";
import { LayoutGrid, Sparkles, Trash2 } from "lucide-react";

type Block =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

type InspirationItem = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  blocks: Block[];
  published: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at?: string | null;
};

export default function AdminInspirationPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>("");
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

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inspiration-content?all=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        setError(null);
      } else {
        setError("Failed to load content.");
      }
    } catch {
      setError("Failed to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setSummary("");
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
    if (blockType === "title" || blockType === "subtitle" || blockType === "paragraph") {
      return blockText.trim().length > 0;
    }
    if (blockType === "video" || blockType === "music" || blockType === "image" || blockType === "svg") {
      return blockUrl.trim().length > 0;
    }
    if (blockType === "chips" || blockType === "keywords") {
      return blockItems.trim().length > 0;
    }
    if (blockType === "custom") {
      return blockJson.trim().length > 0;
    }
    return false;
  }, [blockType, blockText, blockUrl, blockItems, blockJson]);

  const addBlock = () => {
    if (!canAddBlock) return;
    if (blockType === "title" || blockType === "subtitle" || blockType === "paragraph") {
      setBlocks((prev) => [...prev, { type: blockType, text: blockText.trim() }]);
      setBlockText("");
      return;
    }
    if (blockType === "video" || blockType === "music" || blockType === "image" || blockType === "svg") {
      setBlocks((prev) => [
        ...prev,
        { type: blockType, url: blockUrl.trim(), caption: blockCaption.trim() || undefined },
      ]);
      setBlockUrl("");
      setBlockCaption("");
      return;
    }
    if (blockType === "chips" || blockType === "keywords") {
      const items = blockItems
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setBlocks((prev) => [...prev, { type: blockType, items }]);
      setBlockItems("");
      return;
    }
    if (blockType === "custom") {
      try {
        const data = JSON.parse(blockJson);
        setBlocks((prev) => [...prev, { type: "custom", data }]);
        setBlockJson("");
      } catch {
        setError("Custom JSON is invalid.");
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: editingId || undefined,
        title: title.trim(),
        subtitle: subtitle.trim(),
        summary: summary.trim(),
        blocks,
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
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to save content.",
        );
      }
      await loadItems();
      resetForm();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save content.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: InspirationItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setSubtitle(item.subtitle || "");
    setSummary(item.summary || "");
    setPublished(Boolean(item.published));
    setSortOrder(item.sort_order !== null ? String(item.sort_order) : "");
    setBlocks(Array.isArray(item.blocks) ? item.blocks : []);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inspiration-content?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete content.");
      }
      await loadItems();
    } catch {
      setError("Failed to delete content.");
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = items.slice();

    if (needle) {
      list = list.filter((item) => {
        const blob = [
          item.title,
          item.subtitle || "",
          item.summary || "",
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((item) =>
        statusFilter === "published" ? item.published : !item.published,
      );
    }

    list.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "order") {
        return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      }
      if (sortBy === "updated") {
        const aDate = a.updated_at || a.created_at;
        const bDate = b.updated_at || b.created_at;
        return bDate.localeCompare(aDate);
      }
      return b.created_at.localeCompare(a.created_at);
    });

    return list;
  }, [items, query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-4 h-fit">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)] mb-4">
              Admin
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:bg-[var(--md-surface-2)] transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/inspiration"
                className="flex items-center gap-2 rounded-[12px] px-3 py-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] text-[var(--md-text)]"
              >
                <Sparkles className="w-4 h-4" />
                Inspiration Content
              </Link>
            </nav>
          </aside>

          <section className="space-y-6">
            <div className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-6 shadow-sm">
              <h1 className="text-xl font-semibold mb-2">
                Inspiration Content
              </h1>
              <p className="text-sm text-[var(--md-text-muted)] mb-6">
                Manage dynamic inspiration content like video editing ideas,
                tips & tricks, music cues, and blog-style entries.
              </p>

              {error && (
                <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-[12px] p-3">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm"
                />
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subtitle"
                  className="w-full bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm"
                />
              </div>

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary / short paragraph"
                className="mt-4 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm w-full min-h-[90px]"
              />

              <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                <label className="flex items-center gap-2 text-sm text-[var(--md-text-muted)]">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  Published
                </label>
                <input
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="Sort order (optional)"
                  className="w-full sm:w-44 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] outline-none text-sm"
                />
              </div>

              <div className="mt-6 border-t border-[var(--md-outline)] pt-5">
                <div className="text-sm font-semibold mb-3">Blocks</div>
                <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                  <div className="w-full sm:hidden">
                    <div className="text-xs text-[var(--md-text-muted)] mb-2">
                      Block Type
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "title",
                        "subtitle",
                        "paragraph",
                        "video",
                        "music",
                        "image",
                        "svg",
                        "chips",
                        "keywords",
                        "custom",
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setBlockType(option as Block["type"])}
                          className={`px-3 py-2 rounded-[10px] text-xs uppercase tracking-[0.2em] border ${
                            blockType === option
                              ? "bg-[var(--md-primary)] text-[var(--md-on-primary)] border-transparent"
                              : "bg-[var(--md-surface-2)] text-[var(--md-text-muted)] border-[var(--md-outline)]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <select
                    value={blockType}
                    onChange={(e) => setBlockType(e.target.value as Block["type"])}
                    className="hidden sm:block w-56 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                  >
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

                  {(blockType === "title" ||
                    blockType === "subtitle" ||
                    blockType === "paragraph") && (
                    <input
                      value={blockText}
                      onChange={(e) => setBlockText(e.target.value)}
                      placeholder="Text"
                      className="w-full sm:flex-1 sm:min-w-[240px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                    />
                  )}

                  {(blockType === "video" ||
                    blockType === "music" ||
                    blockType === "image" ||
                    blockType === "svg") && (
                    <>
                      <input
                        value={blockUrl}
                        onChange={(e) => setBlockUrl(e.target.value)}
                        placeholder="Media URL"
                        className="w-full sm:flex-1 sm:min-w-[220px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                      />
                      <input
                        value={blockCaption}
                        onChange={(e) => setBlockCaption(e.target.value)}
                        placeholder="Caption (optional)"
                        className="w-full sm:flex-1 sm:min-w-[200px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                      />
                    </>
                  )}

                  {(blockType === "chips" || blockType === "keywords") && (
                    <input
                      value={blockItems}
                      onChange={(e) => setBlockItems(e.target.value)}
                      placeholder="Comma-separated items"
                      className="w-full sm:flex-1 sm:min-w-[240px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                    />
                  )}

                  {blockType === "custom" && (
                    <input
                      value={blockJson}
                      onChange={(e) => setBlockJson(e.target.value)}
                      placeholder='Custom JSON (e.g. {"type":"quote","text":"..."})'
                      className="w-full sm:flex-1 sm:min-w-[260px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                    />
                  )}

                  <button
                    type="button"
                    onClick={addBlock}
                    disabled={!canAddBlock}
                    className="w-full sm:w-auto px-4 py-2 rounded-[12px] bg-[var(--md-primary)] text-[var(--md-on-primary)] text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {blocks.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {blocks.map((block, index) => (
                      <div
                        key={`${block.type}-${index}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[12px] px-3 py-2 text-xs"
                      >
                        <div className="text-[var(--md-text-muted)]">
                          <span className="font-semibold text-[var(--md-text)]">
                            {block.type}
                          </span>
                          {" "}
                          {block.type === "title" ||
                          block.type === "subtitle" ||
                          block.type === "paragraph"
                            ? block.text
                            : block.type === "chips" || block.type === "keywords"
                              ? block.items.join(", ")
                              : block.type === "custom"
                                ? JSON.stringify(block.data)
                                : "url" in block
                                  ? block.url
                                  : ""}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBlocks((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="text-red-300 hover:text-red-200 sm:self-auto self-start"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="w-full sm:w-auto px-5 py-3 rounded-[14px] bg-[var(--md-primary)] text-[var(--md-on-primary)] text-xs font-semibold uppercase tracking-[0.25em] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-4 py-3 rounded-[14px] border border-[var(--md-outline)] text-xs font-semibold uppercase tracking-[0.25em]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Published Posts</h2>
                <span className="text-xs text-[var(--md-text-muted)]">
                  {filtered.length} items
                </span>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center mb-4">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search title or summary"
                  className="w-full sm:flex-1 sm:min-w-[220px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "all" | "published" | "draft");
                    setPage(1);
                  }}
                  className="w-full sm:w-auto bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                >
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full sm:w-auto bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                >
                  <option value="created">Newest</option>
                  <option value="updated">Recently Updated</option>
                  <option value="title">Title</option>
                  <option value="order">Sort Order</option>
                </select>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full sm:w-auto bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                >
                  <option value={6}>6 / page</option>
                  <option value={8}>8 / page</option>
                  <option value={12}>12 / page</option>
                </select>
              </div>
              {loading ? (
                <div className="text-sm text-[var(--md-text-muted)]">
                  Loading...
                </div>
              ) : (
                <div className="grid gap-3">
                  {pageItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[var(--md-outline)] rounded-[12px] px-4 py-4 bg-[var(--md-surface-2)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                              item.published
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            }`}
                          >
                            {item.published ? "Published" : "Draft"}
                          </span>
                          {item.sort_order !== null && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--md-outline)] text-[var(--md-text-muted)]">
                              Order {item.sort_order}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-[var(--md-text-muted)]">
                          {item.subtitle || "No subtitle"}
                        </div>
                        <div className="text-[11px] text-[var(--md-text-muted)] mt-2">
                          Created {formatDate(item.created_at)}
                          {item.updated_at
                            ? ` · Updated ${formatDate(item.updated_at)}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="text-xs px-3 py-1 rounded-[10px] border border-[var(--md-outline)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-[10px] border border-[var(--md-outline)] text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && filtered.length > pageSize && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--md-text-muted)]">
                  <span>
                    Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-[10px] border border-[var(--md-outline)] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-[10px] border border-[var(--md-outline)] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
