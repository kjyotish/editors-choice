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
        throw new Error("Failed to save content.");
      }
      await loadItems();
      resetForm();
    } catch {
      setError("Failed to save content.");
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
                  className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm"
                />
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subtitle"
                  className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm"
                />
              </div>

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary / short paragraph"
                className="mt-4 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none text-sm w-full min-h-[90px]"
              />

              <div className="mt-4 flex flex-wrap gap-4 items-center">
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
                  className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] outline-none text-sm w-44"
                />
              </div>

              <div className="mt-6 border-t border-[var(--md-outline)] pt-5">
                <div className="text-sm font-semibold mb-3">Blocks</div>
                <div className="flex flex-wrap gap-3 items-center">
                  <select
                    value={blockType}
                    onChange={(e) => setBlockType(e.target.value as Block["type"])}
                    className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
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
                      className="flex-1 min-w-[240px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
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
                        className="flex-1 min-w-[220px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                      />
                      <input
                        value={blockCaption}
                        onChange={(e) => setBlockCaption(e.target.value)}
                        placeholder="Caption (optional)"
                        className="flex-1 min-w-[200px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                      />
                    </>
                  )}

                  {(blockType === "chips" || blockType === "keywords") && (
                    <input
                      value={blockItems}
                      onChange={(e) => setBlockItems(e.target.value)}
                      placeholder="Comma-separated items"
                      className="flex-1 min-w-[240px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                    />
                  )}

                  {blockType === "custom" && (
                    <input
                      value={blockJson}
                      onChange={(e) => setBlockJson(e.target.value)}
                      placeholder='Custom JSON (e.g. {"type":"quote","text":"..."})'
                      className="flex-1 min-w-[260px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-3 py-2 rounded-[12px] text-sm"
                    />
                  )}

                  <button
                    type="button"
                    onClick={addBlock}
                    disabled={!canAddBlock}
                    className="px-4 py-2 rounded-[12px] bg-[var(--md-primary)] text-[var(--md-on-primary)] text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {blocks.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {blocks.map((block, index) => (
                      <div
                        key={`${block.type}-${index}`}
                        className="flex items-center justify-between gap-3 bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[12px] px-3 py-2 text-xs"
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
                                : block.url}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBlocks((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="text-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="px-5 py-3 rounded-[14px] bg-[var(--md-primary)] text-[var(--md-on-primary)] text-xs font-semibold uppercase tracking-[0.25em] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 rounded-[14px] border border-[var(--md-outline)] text-xs font-semibold uppercase tracking-[0.25em]"
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
                  {items.length} items
                </span>
              </div>
              {loading ? (
                <div className="text-sm text-[var(--md-text-muted)]">
                  Loading...
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[var(--md-outline)] rounded-[12px] px-3 py-3 bg-[var(--md-surface-2)] flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-[var(--md-text-muted)]">
                          {item.subtitle || "No subtitle"}
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
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
