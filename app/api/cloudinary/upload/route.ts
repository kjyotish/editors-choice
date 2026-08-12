import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { enforceSharedRateLimit, getClientIp } from "@/app/lib/requestRuntime";

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

const MEDIA_FOLDERS: Record<string, string> = {
  image: "images",
  video: "videos",
  music: "audio",
};

const ALLOWED_MEDIA: Record<string, { types: string[]; extensions: string[]; signatures: number[][] }> = {
  image: { types: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"], extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"], signatures: [[0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47], [0x47, 0x49, 0x46, 0x38], [0x52, 0x49, 0x46, 0x46], [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]] },
  video: { types: ["video/mp4", "video/webm", "video/ogg"], extensions: ["mp4", "webm", "ogv"], signatures: [[0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70], [0x1a, 0x45, 0xdf, 0xa3], [0x4f, 0x67, 0x67, 0x53]] },
  music: { types: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4", "audio/flac"], extensions: ["mp3", "wav", "ogg", "aac", "m4a", "flac"], signatures: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0x52, 0x49, 0x46, 0x46], [0x4f, 0x67, 0x67, 0x53], [0x66, 0x4c, 0x61, 0x43], [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]] },
};

const matchesSignature = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => byte === 0 || bytes[index] === byte);
const startsWith = (bytes: Uint8Array, value: number[], offset = 0) => value.every((byte, index) => bytes[offset + index] === byte);
const hasIsoBrand = (bytes: Uint8Array, brands: string[]) =>
  startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) && brands.some((brand) => startsWith(bytes, [...Buffer.from(brand)], 8));

const hasExpectedContent = (kind: string, extension: string, bytes: Uint8Array) => {
  if (kind === "image" && extension === "webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  if (kind === "image" && extension === "avif") return hasIsoBrand(bytes, ["avif", "avis"]);
  if (kind === "video" && extension === "mp4") return hasIsoBrand(bytes, ["isom", "iso2", "mp41", "mp42", "avc1", "dash"]);
  if (kind === "music" && extension === "m4a") return hasIsoBrand(bytes, ["M4A ", "M4B ", "isom", "mp42"]);
  return ALLOWED_MEDIA[kind]?.signatures.some((signature) => matchesSignature(bytes, signature)) ?? false;
};

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
};

export async function POST(req: Request) {
  const rateLimit = await enforceSharedRateLimit(`media-upload:${getClientIp(req)}`, 20, 60_000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Upload service is temporarily unavailable. Please try again later." }, { status: rateLimit.status });
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");
  const baseFolder = getEnv("CLOUDINARY_UPLOAD_FOLDER") || "editors-choice";

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const mediaKind = String(formData.get("kind") || "").trim().toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
    }

    const rule = ALLOWED_MEDIA[mediaKind];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (!rule || !rule.types.includes(file.type.toLowerCase()) || !rule.extensions.includes(extension) || !hasExpectedContent(mediaKind, extension, bytes)) {
      return NextResponse.json({ error: "Unsupported or invalid media file." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "The selected file is too large. Max size is 50 MB." },
        { status: 400 },
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folderSuffix = MEDIA_FOLDERS[mediaKind];
    const folder = `${baseFolder}/${folderSuffix}`;
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("folder", folder);
    uploadForm.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: uploadForm,
      },
    );

    const uploadData = (await uploadRes.json().catch(() => null)) as
      | {
          secure_url?: string;
          public_id?: string;
          resource_type?: string;
          format?: string;
          bytes?: number;
          original_filename?: string;
          error?: { message?: string };
        }
      | null;

    if (!uploadRes.ok || !uploadData?.secure_url) {
      return NextResponse.json(
        {
          error:
            "Cloudinary upload failed. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        secureUrl: uploadData.secure_url,
        publicId: uploadData.public_id || "",
        resourceType: uploadData.resource_type || "",
        format: uploadData.format || "",
        bytes: Number(uploadData.bytes || 0),
        originalFilename: uploadData.original_filename || file.name,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to upload media." },
      { status: 500 },
    );
  }
}
