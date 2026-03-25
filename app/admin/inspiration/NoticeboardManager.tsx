"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { MonitorPlay, Trash2 } from "lucide-react";
import { uploadFileToCloudinary } from "../mediaUpload";
import type { NoticeboardItem } from "./types";

type Props = {
  items: NoticeboardItem[];
  loading: boolean;
};

const noticeboardTypeOptions: NoticeboardItem["media_type"][] = ["image", "svg", "gif", "video"];

export default function NoticeboardManager({ items, loading }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<NoticeboardItem["media_type"]>("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mediaFile]);

  const resetForm = () => {
    setEditingId(null);
    setMediaType("image");
    setMediaUrl("");
    setMediaFile(null);
    setUploadProgress(0);
    setAltText("");
    setLinkUrl("");
    setIsActive(true);
    setSortOrder("");
  };

  const reload = () => {
    setRefreshKey((current) => current + 1);
    window.location.reload();
  };

  const getMediaAccept = (type: NoticeboardItem["media_type"]) => {
    if (type === "image" || type === "gif") return "image/*,.svg";
    if (type === "svg") return ".svg,image/svg+xml";
    if (type === "video") return "video/*";
    return "*/*";
  };

  const getUploadKind = (type: NoticeboardItem["media_type"]) => {
    return type === "video" ? "video" : "image";
  };

  const uploadNoticeboardMedia = async () => {
    if (!mediaFile) {
      setError("Choose a media file before uploading.");
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setError(null);

    try {
      const data = await uploadFileToCloudinary({
        file: mediaFile,
        kind: getUploadKind(mediaType),
        onProgress: setUploadProgress,
      });

      if (!data.secureUrl) {
        throw new Error(data.error || "Failed to upload noticeboard media.");
      }

      setMediaUrl(data.secureUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload noticeboard media.",
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!mediaUrl.trim()) {
        throw new Error("Media URL is required for noticeboard content.");
      }

      const payload = {
        id: editingId || undefined,
        mediaType,
        mediaUrl: mediaUrl.trim(),
        altText: altText.trim(),
        linkUrl: linkUrl.trim(),
        isActive,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      };

      const res = await fetch("/api/noticeboard", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to save noticeboard content.",
        );
      }

      resetForm();
      reload();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save noticeboard content.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: NoticeboardItem) => {
    setEditingId(item.id);
    setMediaType(item.media_type);
    setMediaUrl(item.media_url || "");
    setMediaFile(null);
    setUploadProgress(0);
    setAltText(item.alt_text || "");
    setLinkUrl(item.link_url || "");
    setIsActive(Boolean(item.is_active));
    setSortOrder(item.sort_order !== null ? String(item.sort_order) : "");
    setError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/noticeboard?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete noticeboard content.");
      }
      if (editingId === id) {
        resetForm();
      }
      reload();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete noticeboard content.",
      );
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const currentPreview = mediaPreviewUrl || mediaUrl.trim();

  return (
    <>
      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              <MonitorPlay className="h-4 w-4 text-[var(--md-primary)]" />
              Noticeboard Upload
            </div>
            <h2 className="text-lg font-semibold">Noticeboard Content</h2>
            <p className="mt-2 text-sm text-[var(--md-text-muted)]">
              Upload only the media you want to show in the noticeboard card. No title, keywords, or post fields are required here.
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
            <span className="block text-xs uppercase tracking-[0.24em]">Media Type</span>
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as NoticeboardItem["media_type"])}
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
            >
              {noticeboardTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-[var(--md-text-muted)]">
            <span className="block text-xs uppercase tracking-[0.24em]">Sort Order</span>
            <input
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
            />
          </label>
        </div>

        <input
          value={mediaUrl}
          onChange={(event) => setMediaUrl(event.target.value)}
          placeholder="Noticeboard Cloudinary media URL"
          className="mt-4 w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="file"
            accept={getMediaAccept(mediaType)}
            onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void uploadNoticeboardMedia()}
            disabled={uploadingMedia || !mediaFile}
            className="w-full rounded-[14px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text)] disabled:opacity-50 md:w-auto"
          >
            {uploadingMedia ? `Uploading ${uploadProgress}%` : "Upload Media"}
          </button>
        </div>

        {mediaFile && (
          <div className="mt-4 rounded-[14px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3 text-xs text-[var(--md-text-muted)]">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{"Selected file"}</span>
              <span>{Math.max(1, Math.round(mediaFile.size / 1024))} KB</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[var(--md-primary)] transition-all" style={{ width: `${uploadingMedia ? uploadProgress : 0}%` }} />
            </div>
            <div className="mt-2">{uploadingMedia ? `Uploading to Cloudinary: ${uploadProgress}%` : "Ready to upload"}</div>
          </div>
        )}

        {currentPreview && (
          <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
            {(mediaType === "image" || mediaType === "svg" || mediaType === "gif") && (
              <Image src={currentPreview} alt={altText || "Noticeboard preview"} width={1200} height={720} unoptimized className="h-56 w-full object-cover" />
            )}
            {mediaType === "video" && (
              <video src={currentPreview} controls className="h-56 w-full bg-black object-contain" />
            )}
            <div className="border-t border-[var(--md-outline)] px-3 py-2 text-xs text-[var(--md-text-muted)]">
              {mediaFile ? "Local preview before upload" : "Current saved noticeboard media"}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Alt text / accessibility label (optional)"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="Optional click-through link"
            className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--md-text-muted)]">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Show on live noticeboard
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !mediaUrl.trim()}
            className="w-full rounded-[14px] bg-[var(--md-primary)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-on-primary)] disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving..." : editingId ? "Update Noticeboard" : "Save Noticeboard"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="w-full rounded-[14px] border border-[var(--md-outline)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] sm:w-auto"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Noticeboard Items</h2>
          <span className="text-xs text-[var(--md-text-muted)]">{items.length} items</span>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--md-text-muted)]">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 text-sm text-[var(--md-text-muted)]">
            No noticeboard content saved yet.
          </div>
        ) : (
          <div className="grid gap-3" key={refreshKey}>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 md:flex-row md:items-center"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full border border-[var(--md-outline)] px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-[var(--md-text-muted)]">
                      {item.media_type}
                    </span>
                    <span
                      className={
                        item.is_active
                          ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300"
                          : "rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-[11px] text-slate-300"
                      }
                    >
                      {item.is_active ? "Live" : "Hidden"}
                    </span>
                    {item.sort_order !== null && (
                      <span className="rounded-full border border-[var(--md-outline)] px-2 py-0.5 text-[11px] text-[var(--md-text-muted)]">
                        Order {item.sort_order}
                      </span>
                    )}
                  </div>
                  <div className="break-all text-sm font-medium text-[var(--md-text)]">{item.media_url}</div>
                  <div className="mt-1 text-xs text-[var(--md-text-muted)]">{item.alt_text || "No alt text"}</div>
                  {item.link_url && (
                    <div className="mt-1 break-all text-xs text-[var(--md-text-muted)]">Link: {item.link_url}</div>
                  )}
                  <div className="mt-1 text-[11px] text-[var(--md-text-muted)]">
                    Created {formatDate(item.created_at)}
                    {item.updated_at ? ` | Updated ${formatDate(item.updated_at)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-[10px] border border-[var(--md-outline)] px-3 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="rounded-[10px] border border-[var(--md-outline)] p-2 text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}






