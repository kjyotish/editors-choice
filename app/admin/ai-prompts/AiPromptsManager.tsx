"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Film, ImageUp, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { uploadFileToCloudinary } from "../mediaUpload";

export type AiPromptItem = {
  id: string;
  title: string;
  prompt_type: "image_generation" | "color_grade_image" | "image_to_video";
  prompt_text: string;
  before_image_url: string | null;
  after_image_url: string | null;
  published: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at?: string | null;
};

type Props = {
  items: AiPromptItem[];
  loading: boolean;
};

const promptTypeOptions: Array<{
  value: AiPromptItem["prompt_type"];
  label: string;
  description: string;
}> = [
  {
    value: "image_generation",
    label: "Image Generation",
    description: "For stylized image prompts and cinematic stills.",
  },
  {
    value: "color_grade_image",
    label: "Color Grade Image",
    description: "For grading prompts that shape mood and tone.",
  },
  {
    value: "image_to_video",
    label: "Image to Video",
    description: "For motion prompts that animate a still image.",
  },
];

const typeLabelMap: Record<AiPromptItem["prompt_type"], string> = {
  image_generation: "Image Generation",
  color_grade_image: "Color Grade Image",
  image_to_video: "Image to Video",
};

const getTypeIcon = (type: AiPromptItem["prompt_type"]) => {
  if (type === "image_to_video") return <Film className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
};

const mediaFrameClass =
  "aspect-square w-full overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]";

const mediaPlaceholderClass =
  "flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]";

export default function AiPromptsManager({ items, loading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [promptType, setPromptType] = useState<AiPromptItem["prompt_type"]>("image_generation");
  const [promptText, setPromptText] = useState("");
  const [beforeImageUrl, setBeforeImageUrl] = useState("");
  const [afterImageUrl, setAfterImageUrl] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string | null>(null);
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [beforeProgress, setBeforeProgress] = useState(0);
  const [afterProgress, setAfterProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!beforeFile) {
      setBeforePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(beforeFile);
    setBeforePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [beforeFile]);

  useEffect(() => {
    if (!afterFile) {
      setAfterPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(afterFile);
    setAfterPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [afterFile]);

  const currentBeforePreview = beforePreviewUrl || beforeImageUrl.trim();
  const currentAfterPreview = afterPreviewUrl || afterImageUrl.trim();

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setPromptType("image_generation");
    setPromptText("");
    setBeforeImageUrl("");
    setAfterImageUrl("");
    setBeforeFile(null);
    setAfterFile(null);
    setBeforeProgress(0);
    setAfterProgress(0);
    setPublished(true);
    setSortOrder("");
    setError(null);
  };

  const reload = () => {
    window.location.reload();
  };

  const uploadPromptImage = async (target: "before" | "after") => {
    const file = target === "before" ? beforeFile : afterFile;
    if (!file) {
      setError("Choose an image before uploading.");
      return;
    }

    if (target === "before") {
      setUploadingBefore(true);
      setBeforeProgress(0);
    } else {
      setUploadingAfter(true);
      setAfterProgress(0);
    }

    setError(null);

    try {
      const data = await uploadFileToCloudinary({
        file,
        kind: "image",
        onProgress: target === "before" ? setBeforeProgress : setAfterProgress,
      });

      if (!data.secureUrl) {
        throw new Error(data.error || "Failed to upload AI prompt image.");
      }

      if (target === "before") {
        setBeforeImageUrl(data.secureUrl);
      } else {
        setAfterImageUrl(data.secureUrl);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload AI prompt image.");
    } finally {
      if (target === "before") {
        setUploadingBefore(false);
      } else {
        setUploadingAfter(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!promptText.trim()) throw new Error("Prompt text is required.");

      const payload = {
        id: editingId || undefined,
        title: title.trim(),
        promptType,
        promptText: promptText.trim(),
        beforeImageUrl: beforeImageUrl.trim() || null,
        afterImageUrl: afterImageUrl.trim() || null,
        published,
        sortOrder: sortOrder ? Number(sortOrder) : null,
      };

      const res = await fetch("/api/ai-prompts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save AI prompt.");
      }

      resetForm();
      reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save AI prompt.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AiPromptItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setPromptType(item.prompt_type);
    setPromptText(item.prompt_text || "");
    setBeforeImageUrl(item.before_image_url || "");
    setAfterImageUrl(item.after_image_url || "");
    setBeforeFile(null);
    setAfterFile(null);
    setBeforeProgress(0);
    setAfterProgress(0);
    setPublished(Boolean(item.published));
    setSortOrder(item.sort_order !== null ? String(item.sort_order) : "");
    setError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-prompts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete AI prompt.");
      if (editingId === id) resetForm();
      reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete AI prompt.");
    }
  };

  const copyPrompt = async (item: AiPromptItem) => {
    const text = item.prompt_text.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1600);
    } catch {
      setError("Copy failed. Please try again.");
    }
  };

  const copyShareLink = async (item: AiPromptItem) => {
    try {
      const shareUrl = `${window.location.origin}/ai-prompts?prompt=${encodeURIComponent(item.id)}#prompt-${item.id}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      setError("Link copy failed. Please try again.");
    }
  };

  const promptItems = useMemo(() => items.slice(), [items]);

  return (
    <section className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            <ImageUp className="h-4 w-4 text-[var(--md-primary)]" />
            AI Prompt Upload
          </div>
          <h2 className="text-lg font-semibold">Dashboard Prompt Panel</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--md-text-muted)]">
            Upload a title, prompt text, and before/after image pair for the public AI Prompts page.
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
        <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
          <span className="block text-xs uppercase tracking-[0.24em]">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Viral cinematic image prompt"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
          <span className="block text-xs uppercase tracking-[0.24em]">Prompt Type</span>
          <select
            value={promptType}
            onChange={(event) => setPromptType(event.target.value as AiPromptItem["prompt_type"])}
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          >
            {promptTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {promptTypeOptions.map((option) => (
          <div
            key={option.value}
            className={`rounded-[16px] border px-4 py-3 text-sm ${
              promptType === option.value
                ? "border-[rgba(124,131,255,0.45)] bg-[rgba(124,131,255,0.08)]"
                : "border-[var(--md-outline)] bg-[var(--md-surface-2)]"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-[var(--md-text)]">
              {getTypeIcon(option.value)}
              {option.label}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--md-text-muted)]">{option.description}</p>
          </div>
        ))}
      </div>

      <label className="mt-4 block space-y-2 text-sm text-[var(--md-text-muted)]">
        <span className="block text-xs uppercase tracking-[0.24em]">Prompt</span>
        <textarea
          value={promptText}
          onChange={(event) => setPromptText(event.target.value)}
          placeholder="Write the exact prompt users should copy and reuse."
          className="min-h-[180px] w-full rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm leading-6 outline-none"
        />
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
          <span className="block text-xs uppercase tracking-[0.24em]">Before Image URL</span>
          <input
            value={beforeImageUrl}
            onChange={(event) => setBeforeImageUrl(event.target.value)}
            placeholder="Cloudinary or image URL"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
          <span className="block text-xs uppercase tracking-[0.24em]">After Image URL</span>
          <input
            value={afterImageUrl}
            onChange={(event) => setAfterImageUrl(event.target.value)}
            placeholder="Cloudinary or image URL"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            Before Image
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setBeforeFile(event.target.files?.[0] || null)}
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-sm outline-none file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.25em] file:text-[var(--md-on-primary)]"
          />
          <button
            type="button"
            onClick={() => void uploadPromptImage("before")}
            disabled={uploadingBefore || !beforeFile}
            className="mt-3 inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
          >
            <ImageUp className="h-4 w-4" />
            {uploadingBefore ? `Uploading ${beforeProgress}%` : "Upload Before"}
          </button>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--md-surface)]">
            <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingBefore ? beforeProgress : 0}%` }} />
          </div>
          <div className="mt-2 text-xs text-[var(--md-text-muted)]">
            {uploadingBefore ? `Uploading to Cloudinary: ${beforeProgress}%` : "Ready to upload"}
          </div>
          <div className={`mt-4 ${mediaFrameClass}`}>
            {currentBeforePreview ? (
              <img
                src={currentBeforePreview}
                alt="Before preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={mediaPlaceholderClass}>Before image preview</div>
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            After Image
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setAfterFile(event.target.files?.[0] || null)}
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-sm outline-none file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.25em] file:text-[var(--md-on-primary)]"
          />
          <button
            type="button"
            onClick={() => void uploadPromptImage("after")}
            disabled={uploadingAfter || !afterFile}
            className="mt-3 inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
          >
            <ImageUp className="h-4 w-4" />
            {uploadingAfter ? `Uploading ${afterProgress}%` : "Upload After"}
          </button>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--md-surface)]">
            <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingAfter ? afterProgress : 0}%` }} />
          </div>
          <div className="mt-2 text-xs text-[var(--md-text-muted)]">
            {uploadingAfter ? `Uploading to Cloudinary: ${afterProgress}%` : "Ready to upload"}
          </div>
          <div className={`mt-4 ${mediaFrameClass}`}>
            {currentAfterPreview ? (
              <img
                src={currentAfterPreview}
                alt="After preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={mediaPlaceholderClass}>After image preview</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
          <span className="block text-xs uppercase tracking-[0.24em]">Sort Order</span>
          <input
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
        </label>
        <label className="flex items-center gap-3 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--md-outline)] bg-[var(--md-surface)]"
          />
          <span>Publish on public page</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || uploadingBefore || uploadingAfter}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-primary)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-on-primary)] disabled:opacity-50"
        >
          <ExternalLink className="h-4 w-4" />
          {saving ? "Saving..." : editingId ? "Update Prompt" : "Publish Prompt"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-[var(--md-outline)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-8 border-t border-[var(--md-outline)] pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              Saved Prompts
            </h3>
            <p className="mt-1 text-sm text-[var(--md-text-muted)]">
              Review the prompt cards that will appear on the public page.
            </p>
          </div>
          {loading && <span className="text-xs text-[var(--md-text-muted)]">Loading...</span>}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {promptItems.map((item) => {
            return (
              <article
                key={item.id}
                className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
                      {getTypeIcon(item.prompt_type)}
                      {typeLabelMap[item.prompt_type]}
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-[var(--md-text)]">{item.title}</h4>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                    {item.published ? "Live" : "Draft"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={mediaFrameClass}>
                    {item.before_image_url ? (
                      <img
                        src={item.before_image_url}
                        alt={`${item.title} before`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={mediaPlaceholderClass}>Before</div>
                    )}
                  </div>
                  <div className={mediaFrameClass}>
                    {item.after_image_url ? (
                      <img
                        src={item.after_image_url}
                        alt={`${item.title} after`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={mediaPlaceholderClass}>After</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">Prompt</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--md-text)]">
                    {item.prompt_text}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyPrompt(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                  >
                    {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedId === item.id ? "Copied" : "Copy Prompt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyShareLink(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}

          {!promptItems.length && !loading && (
            <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-sm text-[var(--md-text-muted)]">
              No AI prompts saved yet. Add the first prompt above to publish it on the public page.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
