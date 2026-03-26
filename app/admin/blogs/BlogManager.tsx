"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  extractPlainTextFromBlogMarkup,
  parseBlogContent,
  sanitizeBlogHtml,
  serializeBlogContent,
  type BlogBlock,
} from "@/app/lib/blogs";
import { uploadFileToCloudinary } from "../mediaUpload";

export type BlogItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[] | null;
  published: boolean;
  sort_order: number | null;
  published_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

type Props = {
  items: BlogItem[];
  loading: boolean;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const isMediaBlockType = (type: BlogBlock["type"]): type is "video" | "music" | "image" | "svg" =>
  type === "video" || type === "music" || type === "image" || type === "svg";
const isSimpleTextBlockType = (type: BlogBlock["type"]): type is "title" | "subtitle" =>
  type === "title" || type === "subtitle";

export default function BlogManager({ items, loading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [blockType, setBlockType] = useState<BlogBlock["type"]>("paragraph");
  const [blockText, setBlockText] = useState("");
  const [blockUrl, setBlockUrl] = useState("");
  const [blockCaption, setBlockCaption] = useState("");
  const [blockFile, setBlockFile] = useState<File | null>(null);
  const [blockPreviewUrl, setBlockPreviewUrl] = useState<string | null>(null);
  const [blockItems, setBlockItems] = useState("");
  const [blockJson, setBlockJson] = useState("");
  const [uploadingBlockMedia, setUploadingBlockMedia] = useState(false);
  const [blockUploadProgress, setBlockUploadProgress] = useState(0);
  const blockEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!coverImageFile) {
      setCoverPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(coverImageFile);
    setCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverImageFile]);

  useEffect(() => {
    if (!blockFile) {
      setBlockPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blockFile);
    setBlockPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blockFile]);

  useEffect(() => {
    if (blockType !== "paragraph") return;
    const editor = blockEditorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== blockText) {
      editor.innerHTML = blockText;
    }
  }, [blockText, blockType]);

  const currentCoverPreview = coverPreviewUrl || coverImageUrl.trim();
  const currentBlockPreview = blockPreviewUrl || blockUrl.trim();

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setCoverImageUrl("");
    setCoverImageFile(null);
    setCoverUploadProgress(0);
    setTags("");
    setSortOrder("");
    setPublished(false);
    setBlocks([]);
    setBlockType("paragraph");
    setBlockText("");
    setBlockUrl("");
    setBlockCaption("");
    setBlockFile(null);
    setBlockItems("");
    setBlockJson("");
    setBlockUploadProgress(0);
    setError(null);
  };

  const reload = () => {
    window.location.reload();
  };

  const handleTitleChange = (value: string) => {
    const currentAutoSlug = slugify(title);
    setTitle(value);
    if (!editingId || slug === "" || slug === currentAutoSlug) {
      setSlug(slugify(value));
    }
  };

  const canAddBlock = useMemo(() => {
    if (blockType === "title" || blockType === "subtitle") {
      return blockText.trim().length > 0;
    }
    if (blockType === "paragraph") {
      return extractPlainTextFromBlogMarkup(blockText).trim().length > 0;
    }
    if (isMediaBlockType(blockType)) {
      return blockUrl.trim().length > 0;
    }
    if (blockType === "chips" || blockType === "keywords") return blockItems.trim().length > 0;
    if (blockType === "custom") return blockJson.trim().length > 0;
    return false;
  }, [blockItems, blockJson, blockText, blockType, blockUrl]);

  const addBlock = () => {
    setError(null);
    if (!canAddBlock) return;

    if (blockType === "title" || blockType === "subtitle") {
      setBlocks((prev) => [...prev, { type: blockType, text: blockText.trim() }]);
      setBlockText("");
      return;
    }

    if (blockType === "paragraph") {
      const html = sanitizeBlogHtml(blockText);
      const plainText = extractPlainTextFromBlogMarkup(html || blockText).trim();
      if (!plainText) return;
      setBlocks((prev) => [...prev, { type: "paragraph", text: plainText, html: html || undefined }]);
      setBlockText("");
      return;
    }

    if (isMediaBlockType(blockType)) {
      setBlocks((prev) => [
        ...prev,
        { type: blockType, url: blockUrl.trim(), caption: blockCaption.trim() || undefined },
      ]);
      setBlockUrl("");
      setBlockCaption("");
      setBlockFile(null);
      setBlockUploadProgress(0);
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

  const getMediaAccept = (type: BlogBlock["type"]) => {
    if (type === "image") return "image/*,.svg";
    if (type === "svg") return ".svg,image/svg+xml";
    if (type === "video") return "video/*";
    if (type === "music") return "audio/*";
    return "*/*";
  };

  const uploadBlockMedia = async () => {
    if (!blockFile || !isMediaBlockType(blockType)) {
      setError("Choose a media file before uploading.");
      return;
    }

    setUploadingBlockMedia(true);
    setBlockUploadProgress(0);
    setError(null);

    try {
      const data = await uploadFileToCloudinary({
        file: blockFile,
        kind: blockType,
        onProgress: setBlockUploadProgress,
      });

      if (!data.secureUrl) {
        throw new Error(data.error || "Failed to upload blog media.");
      }

      setBlockUrl(data.secureUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload blog media.");
    } finally {
      setUploadingBlockMedia(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!title.trim()) {
        throw new Error("Blog title is required.");
      }
      if (blocks.length === 0) {
        throw new Error("Add at least one blog block before saving.");
      }

      const payload = {
        id: editingId || undefined,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: serializeBlogContent(blocks),
        coverImageUrl: coverImageUrl.trim(),
        tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
        published,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      };

      const res = await fetch("/api/blogs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save blog.");
      }

      resetForm();
      reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save blog.");
    } finally {
      setSaving(false);
    }
  };

  const uploadCoverImage = async () => {
    if (!coverImageFile) {
      setError("Choose a cover image file before uploading.");
      return;
    }

    setUploadingCover(true);
    setCoverUploadProgress(0);
    setError(null);

    try {
      const data = await uploadFileToCloudinary({
        file: coverImageFile,
        kind: "image",
        onProgress: setCoverUploadProgress,
      });

      if (!data.secureUrl) {
        throw new Error(data.error || "Failed to upload blog cover image.");
      }

      setCoverImageUrl(data.secureUrl);
      setCoverImageFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload blog cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEdit = (item: BlogItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSlug(item.slug);
    setExcerpt(item.excerpt || "");
    setCoverImageUrl(item.cover_image_url || "");
    setCoverImageFile(null);
    setCoverUploadProgress(0);
    setTags(Array.isArray(item.tags) ? item.tags.join(", ") : "");
    setSortOrder(item.sort_order !== null ? String(item.sort_order) : "");
    setPublished(Boolean(item.published));
    setBlocks(parseBlogContent(item.content).blocks);
    setBlockType("paragraph");
    setBlockText("");
    setBlockUrl("");
    setBlockCaption("");
    setBlockFile(null);
    setBlockItems("");
    setBlockJson("");
    setBlockUploadProgress(0);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blogs?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete blog.");
      }
      if (editingId === id) resetForm();
      reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete blog.");
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (!needle) return true;
        return [item.title, item.slug, item.excerpt || "", item.content]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (a.published !== b.published) return a.published ? -1 : 1;
        return (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at);
      });
  }, [items, query]);

  const getBlockPreview = (block: BlogBlock) => {
    if (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") {
      return block.text;
    }
    if (block.type === "chips" || block.type === "keywords") {
      return block.items.join(", ");
    }
    if (block.type === "custom") {
      return JSON.stringify(block.data);
    }
    if (block.type === "video" || block.type === "music" || block.type === "image" || block.type === "svg") {
      return block.url;
    }
    return "";
  };
  const formatDate = (value: string | null) => {
    if (!value) return "Not published";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <>
      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Daily Blogs</h1>
        <p className="mb-6 mt-2 text-sm text-[var(--md-text-muted)]">
          Build blog posts with text, image, video, audio, chips, and structured blocks just like the inspiration editor.
        </p>

        {error && (
          <div className="mb-4 rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <input value={title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Blog title" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
          <input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="Slug" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
        </div>

        <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="Short excerpt for homepage and SEO" className="mt-4 min-h-[90px] w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="Cover image URL (optional)" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="file"
                accept="image/*,.svg"
                onChange={(event) => setCoverImageFile(event.target.files?.[0] || null)}
                className="min-w-0 w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none file:mb-2 file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-[var(--md-on-primary)] md:file:mb-0"
              />
              <button type="button" onClick={() => void uploadCoverImage()} disabled={uploadingCover || !coverImageFile} className="rounded-[14px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] disabled:opacity-50">
                {uploadingCover ? `Uploading ${coverUploadProgress}%` : "Upload Cover"}
              </button>
            </div>
            {coverImageFile && (
              <div className="rounded-[14px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3 text-xs text-[var(--md-text-muted)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">Selected file</span>
                  <span>{Math.max(1, Math.round(coverImageFile.size / 1024))} KB</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                  <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingCover ? coverUploadProgress : 0}%` }} />
                </div>
                <div className="mt-2">{uploadingCover ? `Uploading to Cloudinary: ${coverUploadProgress}%` : "Ready to upload"}</div>
              </div>
            )}
            {currentCoverPreview && (
              <div className="overflow-hidden rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
                <Image src={currentCoverPreview} alt="Blog cover preview" width={1200} height={640} unoptimized className="h-44 w-full object-cover" />
                <div className="border-t border-[var(--md-outline)] px-3 py-2 text-xs text-[var(--md-text-muted)]">
                  {coverImageFile ? "Local preview before upload" : "Current saved cover"}
                </div>
              </div>
            )}
          </div>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags (comma-separated)" className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none" />
        </div>

        <div className="mt-6 border-t border-[var(--md-outline)] pt-5">
          <div className="mb-3 text-sm font-semibold">Blog Blocks</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select value={blockType} onChange={(event) => setBlockType(event.target.value as BlogBlock["type"])} className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm">
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

            {isSimpleTextBlockType(blockType) && (
              <input value={blockText} onChange={(event) => setBlockText(event.target.value)} placeholder="Text" className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm md:col-span-2 xl:col-span-3" />
            )}

            {blockType === "paragraph" && (
              <div className="min-w-0 md:col-span-2 xl:col-span-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--md-text-muted)]">
                  Paste formatted paragraph content
                </div>
                <div className="relative">
                  {!extractPlainTextFromBlogMarkup(blockText) && (
                    <div className="pointer-events-none absolute left-3 top-3 text-sm text-[var(--md-text-muted)]">
                      Paste copied text here. Bold, italic, underline, links, colors, and blank lines will be kept.
                    </div>
                  )}
                  <div
                    ref={blockEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => setBlockText(event.currentTarget.innerHTML)}
                    className="min-h-[180px] w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-3 text-sm leading-7 text-[var(--md-text)] outline-none"
                  />
                </div>
              </div>
            )}

            {isMediaBlockType(blockType) && (
              <>
                <input value={blockUrl} onChange={(event) => setBlockUrl(event.target.value)} placeholder="Cloudinary media URL" className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm md:col-span-2 xl:col-span-2" />
                <input value={blockCaption} onChange={(event) => setBlockCaption(event.target.value)} placeholder="Caption (optional)" className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm md:col-span-2 xl:col-span-2" />
                <input type="file" accept={getMediaAccept(blockType)} onChange={(event) => setBlockFile(event.target.files?.[0] || null)} className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm file:mb-2 file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-[var(--md-on-primary)] md:file:mb-0 md:col-span-2 xl:col-span-2" />
                <button type="button" onClick={() => void uploadBlockMedia()} disabled={uploadingBlockMedia || !blockFile} className="w-full rounded-[12px] border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-text)] disabled:opacity-50 md:w-auto md:justify-self-start">
                  {uploadingBlockMedia ? `Uploading ${blockUploadProgress}%` : "Upload Media"}
                </button>
              </>
            )}

            {(blockType === "chips" || blockType === "keywords") && (
              <input value={blockItems} onChange={(event) => setBlockItems(event.target.value)} placeholder="Comma-separated items" className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm md:col-span-2 xl:col-span-3" />
            )}

            {blockType === "custom" && (
              <input value={blockJson} onChange={(event) => setBlockJson(event.target.value)} placeholder='Custom JSON (e.g. {"type":"quote","text":"..."})' className="min-w-0 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm md:col-span-2 xl:col-span-3" />
            )}

            <button type="button" onClick={addBlock} disabled={!canAddBlock} className="w-full rounded-[12px] bg-[var(--md-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-on-primary)] disabled:opacity-50 md:w-auto md:justify-self-start">
              Add Block
            </button>
          </div>

          {isMediaBlockType(blockType) && blockFile && (
            <div className="mt-4 rounded-[14px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3 text-xs text-[var(--md-text-muted)]">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">Selected file</span>
                <span>{Math.max(1, Math.round(blockFile.size / 1024))} KB</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingBlockMedia ? blockUploadProgress : 0}%` }} />
              </div>
              <div className="mt-2">{uploadingBlockMedia ? `Uploading to Cloudinary: ${blockUploadProgress}%` : "Ready to upload"}</div>
            </div>
          )}

          {isMediaBlockType(blockType) && currentBlockPreview && (
            <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
              {(blockType === "image" || blockType === "svg") && <Image src={currentBlockPreview} alt={blockCaption || "Blog block preview"} width={1200} height={720} unoptimized className="h-56 w-full object-cover" />}
              {blockType === "video" && <video src={currentBlockPreview} controls className="h-56 w-full bg-black object-contain" />}
              {blockType === "music" && <div className="p-4"><audio src={currentBlockPreview} controls className="w-full" /></div>}
              <div className="border-t border-[var(--md-outline)] px-3 py-2 text-xs text-[var(--md-text-muted)]">
                {blockFile ? "Local preview before upload" : "Current blog media"}
              </div>
            </div>
          )}

          {blocks.length > 0 && (
            <div className="mt-4 grid gap-2">
              {blocks.map((block, index) => (
                <div key={`${block.type}-${index}`} className="flex flex-col justify-between gap-3 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-xs sm:flex-row sm:items-center">
                  <div className="text-[var(--md-text-muted)]">
                    <span className="font-semibold text-[var(--md-text)]">{block.type}</span>{" "}
                    {getBlockPreview(block)}
                  </div>
                  <button type="button" onClick={() => setBlocks((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="self-start text-red-300 hover:text-red-200 sm:self-auto">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--md-text-muted)]">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
            Publish now
          </label>
          <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} placeholder="Sort order (optional)" className="w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm outline-none sm:w-44" />
        </div>

        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button type="button" onClick={handleSave} disabled={saving || !title.trim() || blocks.length === 0} className="w-full rounded-[14px] bg-[var(--md-primary)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-on-primary)] disabled:opacity-50 sm:w-auto">
            {saving ? "Saving..." : editingId ? "Update Blog" : "Publish Blog"}
          </button>
          <button type="button" onClick={resetForm} className="w-full rounded-[14px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] sm:w-auto">
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Blog Posts</h2>
          <span className="text-xs text-[var(--md-text-muted)]">{filtered.length} items</span>
        </div>

        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search blogs" className="mb-4 w-full rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-sm" />

        {loading ? (
          <div className="text-sm text-[var(--md-text-muted)]">Loading...</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-4 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={item.published ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300" : "rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300"}>
                      {item.published ? "Published" : "Draft"}
                    </span>
                    <span className="rounded-full border border-[var(--md-outline)] px-2 py-0.5 text-[11px] text-[var(--md-text-muted)]">
                      /blogs/{item.slug}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-[var(--md-text-muted)]">{item.excerpt || "No excerpt"}</div>
                  <div className="mt-2 text-[11px] text-[var(--md-text-muted)]">
                    Published {formatDate(item.published_at)} | Created {formatDate(item.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleEdit(item)} className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-[10px] border border-[var(--md-outline)] p-2 text-red-300 hover:text-red-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 text-sm text-[var(--md-text-muted)]">
            No blogs found yet.
          </div>
        )}
      </div>
    </>
  );
}


