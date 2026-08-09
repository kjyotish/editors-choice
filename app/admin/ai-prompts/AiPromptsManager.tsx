"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Film, ImageUp, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { uploadFileToCloudinary } from "../mediaUpload";
import {
  collectPromptSubcategories,
  getPromptCategoryLabel,
  groupPromptsByCategory,
  normalizePromptSubcategory,
  promptCategories,
} from "@/app/ai-prompts/promptCategories";

export type AiPromptItem = {
  id: string;
  title: string;
  prompt_type: "image_generation" | "color_grade_image" | "image_to_video";
  subcategory: string | null;
  prompt_text: string;
  before_image_url: string | null;
  after_image_url: string | null;
  video_url?: string | null;
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
    value: "color_grade_image",
    label: "Cinematic Colour Grade",
    description: "For grading prompts that shape mood and tone.",
  },
  {
    value: "image_generation",
    label: "Image Generate",
    description: "For stylized image prompts and cinematic stills.",
  },
  {
    value: "image_to_video",
    label: "Image to Video",
    description: "For motion prompts that animate a still image.",
  },
];

const getTypeIcon = (type: AiPromptItem["prompt_type"]) => {
  if (type === "image_to_video") return <Film className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
};

const mediaFrameClass =
  "aspect-square w-full overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]";

const mediaPlaceholderClass =
  "flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]";

const isYouTubeUrl = (value: string) =>
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-\-]+)/i.test(value);

const getYouTubeEmbedUrl = (value: string) => {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-\-]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export default function AiPromptsManager({ items, loading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [promptType, setPromptType] = useState<AiPromptItem["prompt_type"]>("image_generation");
  const [subcategory, setSubcategory] = useState("");
  const [promptText, setPromptText] = useState("");
  const [beforeImageUrl, setBeforeImageUrl] = useState("");
  const [afterImageUrl, setAfterImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [beforePreviewUrl, setBeforePreviewUrl] = useState<string | null>(null);
  const [afterPreviewUrl, setAfterPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const beforeInputRef = useRef<HTMLInputElement | null>(null);
  const afterInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [beforeProgress, setBeforeProgress] = useState(0);
  const [afterProgress, setAfterProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [customSubcategories, setCustomSubcategories] = useState<string[]>([]);
  const [savedSubcategories, setSavedSubcategories] = useState<string[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

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

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  useEffect(() => {
    let active = true;

    const loadSubcategories = async () => {
      setSubcategoriesLoading(true);

      try {
        const res = await fetch("/api/ai-prompt-subcategories");
        if (!res.ok) return;

        const data = (await res.json().catch(() => [])) as string[];
        if (!active || !Array.isArray(data)) return;

        setSavedSubcategories(
          data
            .map((value) => value.trim())
            .filter(Boolean),
        );
      } finally {
        if (active) {
          setSubcategoriesLoading(false);
        }
      }
    };

    void loadSubcategories();

    return () => {
      active = false;
    };
  }, []);

  const currentBeforePreview = beforePreviewUrl || beforeImageUrl.trim();
  const currentAfterPreview = afterPreviewUrl || afterImageUrl.trim();
  const currentVideoPreview = videoPreviewUrl || videoUrl.trim();

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setPromptType("image_generation");
    setSubcategory("");
    setPromptText("");
    setBeforeImageUrl("");
    setAfterImageUrl("");
    setVideoUrl("");
    setBeforeFile(null);
    setAfterFile(null);
    setVideoFile(null);
    setBeforeProgress(0);
    setAfterProgress(0);
    setVideoProgress(0);
    setPublished(true);
    setSortOrder("");
    setError(null);

    if (beforeInputRef.current) beforeInputRef.current.value = "";
    if (afterInputRef.current) afterInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const reload = () => {
    window.location.reload();
  };

  const uploadPromptImage = async (target: "before" | "after", uploadFile?: File) => {
    const file = uploadFile || (target === "before" ? beforeFile : afterFile);
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
        setBeforePreviewUrl(data.secureUrl);
        setBeforeFile(null);
        if (beforeInputRef.current) beforeInputRef.current.value = "";
      } else {
        setAfterImageUrl(data.secureUrl);
        setAfterPreviewUrl(data.secureUrl);
        setAfterFile(null);
        if (afterInputRef.current) afterInputRef.current.value = "";
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

  const uploadPromptVideo = async () => {
    if (!videoFile) {
      setError("Choose a video before uploading.");
      return;
    }

    setUploadingVideo(true);
    setVideoProgress(0);
    setError(null);

    try {
      const data = await uploadFileToCloudinary({
        file: videoFile,
        kind: "video",
        onProgress: setVideoProgress,
      });

      if (!data.secureUrl) {
        throw new Error(data.error || "Failed to upload AI prompt video.");
      }

      setVideoUrl(data.secureUrl);
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload AI prompt video.");
    } finally {
      setUploadingVideo(false);
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
        subcategory: subcategory.trim() || null,
        promptText: promptText.trim(),
        beforeImageUrl: beforeImageUrl.trim() || null,
        afterImageUrl: afterImageUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
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
    setSubcategory(item.subcategory || "");
    setPromptText(item.prompt_text || "");
    setBeforeImageUrl(item.before_image_url || "");
    setAfterImageUrl(item.after_image_url || "");
    setVideoUrl((item as AiPromptItem & { video_url?: string }).video_url || "");
    setBeforeFile(null);
    setAfterFile(null);
    setVideoFile(null);
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

  const toggleVisibility = async (item: AiPromptItem) => {
    try {
      const res = await fetch("/api/ai-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          promptType: item.prompt_type,
          subcategory: item.subcategory,
          promptText: item.prompt_text,
          beforeImageUrl: item.before_image_url,
          afterImageUrl: item.after_image_url,
          videoUrl: (item as AiPromptItem & { video_url?: string | null }).video_url || null,
          published: !item.published,
          sortOrder: item.sort_order,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update visibility.");
      }

      reload();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update visibility.");
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

  const shouldCollapsePrompt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    return trimmed.length > 260 || trimmed.split(/\s+/).length > 45;
  };

  const copyShareLink = async (item: AiPromptItem) => {
    try {
      const shareUrl = `${window.location.origin}/ai-prompts/${encodeURIComponent(item.id)}?category=${encodeURIComponent(item.prompt_type)}${item.subcategory ? `&subcategory=${encodeURIComponent(item.subcategory)}` : ""}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      setError("Link copy failed. Please try again.");
    }
  };

  const promptItems = useMemo(() => groupPromptsByCategory(items), [items]);
  const promptSubcategories = useMemo(
    () =>
      collectPromptSubcategories([
        ...items,
        ...savedSubcategories.map((value) => ({ subcategory: value })),
        ...customSubcategories.map((value) => ({ subcategory: value })),
      ]),
    [customSubcategories, items, savedSubcategories],
  );

  const createSubcategory = async () => {
    const label = subcategory.trim();
    if (!label) {
      setError("Subcategory is required.");
      return;
    }

    const normalizedLabel = normalizePromptSubcategory(label);
    if (!normalizedLabel) {
      setError("Subcategory is required.");
      return;
    }

    try {
      const res = await fetch("/api/ai-prompt-subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save subcategory.");
      }

      const saved = (await res.json().catch(() => null)) as { label?: string } | null;
      const savedLabel = saved?.label?.trim() || label;

      setSavedSubcategories((current) =>
        current.some((item) => normalizePromptSubcategory(item) === normalizedLabel)
          ? current
          : [...current, savedLabel],
      );
      setCustomSubcategories((current) =>
        current.some((item) => normalizePromptSubcategory(item) === normalizedLabel)
          ? current
          : [...current, savedLabel],
      );
      setSubcategory(savedLabel);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save subcategory.");
    }
  };

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
        <span className="block text-xs uppercase tracking-[0.24em]">Subcategory Optional</span>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={subcategory}
            onChange={(event) => setSubcategory(event.target.value)}
            placeholder="Wedding, Travel, Product, Festival"
            list="ai-prompt-subcategories"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void createSubcategory()}
            className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)] disabled:cursor-wait disabled:opacity-60"
            disabled={subcategoriesLoading}
          >
            {subcategoriesLoading ? "Saving..." : "Create Subcategory"}
          </button>
        </div>
        <datalist id="ai-prompt-subcategories">
          {promptSubcategories.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <p className="text-xs text-[var(--md-text-muted)]">
          Create a reusable subcategory here, then attach it to a prompt and save. Saved subcategories will stay available for future prompts and the public dropdown.
        </p>
      </label>

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
        {promptType !== "image_to_video" && (
          <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
            <span className="block text-xs uppercase tracking-[0.24em]">Before Image URL</span>
            <input
              value={beforeImageUrl}
              onChange={(event) => setBeforeImageUrl(event.target.value)}
              placeholder="Cloudinary or image URL"
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
            />
          </label>
        )}
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

      {promptType === "image_to_video" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              Before preview
            </div>
            <input
              value={beforeImageUrl}
              onChange={(event) => setBeforeImageUrl(event.target.value)}
              placeholder="Cloudinary image URL or preview image URL"
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
            />
            <div className="mt-3 space-y-3">
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  setBeforeFile(selectedFile);
                  if (selectedFile && promptType === "image_to_video") {
                    void uploadPromptImage("before", selectedFile);
                  }
                }}
                className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-sm outline-none file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.25em] file:text-[var(--md-on-primary)]"
              />
              <button
                type="button"
                onClick={() => void uploadPromptImage("before")}
                disabled={uploadingBefore || !beforeFile}
                className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
              >
                <ImageUp className="h-4 w-4" />
                {uploadingBefore ? `Uploading ${beforeProgress}%` : "Upload Before"}
              </button>
            </div>
            <div className="mt-3 text-xs text-[var(--md-text-muted)]">
              {uploadingBefore
                ? `Uploading to Cloudinary: ${beforeProgress}%`
                : "Upload a before image that appears in the left preview while the video plays."}
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
              Video URL
            </div>
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="Cloudinary video URL or YouTube link"
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
            />
            <p className="mt-2 text-xs text-[var(--md-text-muted)]">
              Paste a YouTube link or a Cloudinary video URL. The uploaded before image will show on the left.
            </p>
            <div className="mt-4 border-t border-[var(--md-outline)] pt-4" />
            <div className="mt-4 space-y-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-sm outline-none file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--md-primary)] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.25em] file:text-[var(--md-on-primary)]"
              />
              <button
                type="button"
                onClick={() => void uploadPromptVideo()}
                disabled={uploadingVideo || !videoFile}
                className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-50"
              >
                <ImageUp className="h-4 w-4" />
                {uploadingVideo ? `Uploading ${videoProgress}%` : "Upload Video"}
              </button>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--md-surface)]">
              <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingVideo ? videoProgress : 0}%` }} />
            </div>
            <div className="mt-2 text-xs text-[var(--md-text-muted)]">
              {uploadingVideo ? `Uploading to Cloudinary: ${videoProgress}%` : "Optional direct video upload"}
            </div>
            <div className={`mt-4 ${mediaFrameClass}`}>
              {currentVideoPreview ? (
                isYouTubeUrl(currentVideoPreview) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(currentVideoPreview) || ""}
                    title="YouTube preview"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={currentVideoPreview}
                    controls={false}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                )
              ) : (
                <div className={mediaPlaceholderClass}>Video preview</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {promptType !== "image_to_video" && (
          <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              Before Image
            </div>
            <input
              ref={beforeInputRef}
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
              {uploadingBefore
                ? `Uploading to Cloudinary: ${beforeProgress}%`
                : "Ready to upload"}
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
        )}

        <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            After Image
          </div>
          <input
            ref={afterInputRef}
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
            {uploadingAfter
              ? `Uploading to Cloudinary: ${afterProgress}%`
              : "Optional after image to display as the right-side thumbnail or fallback preview."}
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
          disabled={saving || uploadingBefore || uploadingAfter || uploadingVideo}
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

        <div className="space-y-8">
          {promptCategories.map((category) => {
            const categoryItems = promptItems[category.key];

            return (
              <section key={category.key} className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold text-[var(--md-text)]">
                      {category.label}
                    </h4>
                    <p className="mt-1 text-sm text-[var(--md-text-muted)]">
                      {category.description}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                    {categoryItems.length} saved
                  </span>
                </div>

                {categoryItems.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {categoryItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
                              {getTypeIcon(item.prompt_type)}
                              {getPromptCategoryLabel(item.prompt_type)}
                            </div>
                            <h4 className="mt-3 text-lg font-semibold text-[var(--md-text)]">{item.title}</h4>
                            {item.subcategory ? (
                              <div className="mt-2 inline-flex rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
                                {item.subcategory}
                              </div>
                            ) : null}
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
                            {item.prompt_type === "image_to_video" ? (
                              item.video_url ? (
                                <div className="relative h-full w-full overflow-hidden">
                                  {item.after_image_url ? (
                                    <img
                                      src={item.after_image_url}
                                      alt={`${item.title} video thumbnail`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : item.before_image_url ? (
                                    <img
                                      src={item.before_image_url}
                                      alt={`${item.title} video thumbnail`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className={mediaPlaceholderClass}>Video thumbnail</div>
                                  )}
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--md-text)]">
                                      <Film className="h-5 w-5" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={mediaPlaceholderClass}>Video preview</div>
                              )
                            ) : item.after_image_url ? (
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
                          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                            Prompt
                          </div>
                          <div className="relative mt-2">
                            <p
                              className={`whitespace-pre-wrap break-words text-sm leading-6 text-[var(--md-text)] ${
                                shouldCollapsePrompt(item.prompt_text) && expandedPromptId !== item.id
                                  ? "max-h-40 overflow-hidden"
                                  : "max-h-none"
                              }`}
                            >
                              {item.prompt_text}
                            </p>
                            {shouldCollapsePrompt(item.prompt_text) && expandedPromptId !== item.id ? (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--md-surface)] to-transparent" />
                            ) : null}
                          </div>
                          {shouldCollapsePrompt(item.prompt_text) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPromptId((current) => (current === item.id ? null : item.id))
                              }
                              className="mt-3 inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                            >
                              {expandedPromptId === item.id ? "Show less" : "Expand prompt"}
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void copyPrompt(item)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                          >
                            {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copiedId === item.id ? "Copied" : "Copy Prompt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                          >
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleVisibility(item)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                          >
                            {item.published ? "Hide" : "Unhide"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyShareLink(item)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-sm text-[var(--md-text-muted)]">
                    No AI prompts saved in this category yet.
                  </div>
                )}
              </section>
            );
          })}

          {!items.length && !loading && (
            <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-sm text-[var(--md-text-muted)]">
              No AI prompts saved yet. Add the first prompt above to publish it on the public page.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
