import crypto from "node:crypto";

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^res\.cloudinary\.com/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
};

type ParsedCloudinaryAsset = {
  publicId: string;
  resourceType: "image" | "video" | "raw";
};

export const getCloudinaryConfig = () => {
  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
};

export const parseCloudinaryAsset = (value: string): ParsedCloudinaryAsset | null => {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const config = getCloudinaryConfig();
    if (!config) return null;
    if (parsed.hostname !== "res.cloudinary.com") return null;

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length < 4) return null;
    if (pathParts[0] !== config.cloudName) return null;

    const resourceType = pathParts[1];
    if (resourceType !== "image" && resourceType !== "video" && resourceType !== "raw") {
      return null;
    }

    const uploadIndex = pathParts.findIndex((part, index) => index >= 2 && part === "upload");
    if (uploadIndex === -1 || uploadIndex + 1 >= pathParts.length) return null;

    const publicIdParts = pathParts.slice(uploadIndex + 1);
    if (publicIdParts.length === 0) return null;

    if (/^v\d+$/.test(publicIdParts[0])) {
      publicIdParts.shift();
    }
    if (publicIdParts.length === 0) return null;

    const lastPart = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^.]+$/, "");
    const publicId = publicIdParts.join("/");
    if (!publicId) return null;

    return {
      publicId,
      resourceType,
    };
  } catch {
    return null;
  }
};

export const destroyCloudinaryAsset = async (value: string) => {
  const parsedAsset = parseCloudinaryAsset(value);
  const config = getCloudinaryConfig();
  if (!parsedAsset || !config) {
    return { ok: false, skipped: true } as const;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = `invalidate=true&public_id=${parsedAsset.publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

  const formData = new FormData();
  formData.append("public_id", parsedAsset.publicId);
  formData.append("invalidate", "true");
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", config.apiKey);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${parsedAsset.resourceType}/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Failed to delete Cloudinary asset.");
  }

  return { ok: true, skipped: false } as const;
};

export const destroyCloudinaryAssets = async (urls: Array<string | null | undefined>) => {
  const uniqueUrls = Array.from(new Set(urls.map((url) => (url || "").trim()).filter(Boolean)));
  for (const url of uniqueUrls) {
    try {
      await destroyCloudinaryAsset(url);
    } catch (error) {
      console.error("Failed to delete Cloudinary asset:", url, error);
    }
  }
};
