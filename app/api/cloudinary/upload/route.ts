import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

const MEDIA_FOLDERS: Record<string, string> = {
  image: "images",
  svg: "images",
  video: "videos",
  music: "audio",
};

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
};

export async function POST(req: Request) {
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

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "The selected file is too large. Max size is 50 MB." },
        { status: 400 },
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folderSuffix = MEDIA_FOLDERS[mediaKind] || "media";
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
            uploadData?.error?.message ||
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
