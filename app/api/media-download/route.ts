import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/authServer";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { enforceSharedRateLimit, getClientIp } from "@/app/lib/requestRuntime";

export const runtime = "nodejs";

const TRUSTED_MEDIA_HOSTS = new Set(["res.cloudinary.com"]);
const ALLOWED_CONTENT_TYPES = /^(image\/(?:avif|gif|jpeg|png|webp)|video\/(?:mp4|webm|ogg)|audio\/(?:mpeg|ogg|wav|x-wav|aac|mp4|flac))$/i;
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "media-file";

const getFilenameFromUrl = (value: string) => {
  try {
    return sanitizeFilename(decodeURIComponent(new URL(value).pathname.split("/").filter(Boolean).pop() || "media-file"));
  } catch {
    return "media-file";
  }
};

const isTrustedMediaUrl = (url: URL) =>
  url.protocol === "https:" && !url.username && !url.password && TRUSTED_MEDIA_HOSTS.has(url.hostname.toLowerCase());

async function downloadsRequireLogin() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return true;
  const { data, error } = await supabaseAdmin.from("site_settings").select("commercial_actions_require_login").eq("id", "global").maybeSingle();
  return error || data?.commercial_actions_require_login === undefined ? true : data.commercial_actions_require_login;
}

export async function GET(req: Request) {
  const rateLimit = await enforceSharedRateLimit(`media-download:${getClientIp(req)}`, 30, 60_000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many download requests. Please try again later." }, { status: rateLimit.status });

  if (await downloadsRequireLogin()) {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let source: URL;
  try {
    source = new URL(searchParams.get("url") || "");
  } catch {
    return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
  }
  if (!isTrustedMediaUrl(source)) {
    return NextResponse.json({ error: "This media source is not approved for download." }, { status: 400 });
  }

  let upstream: Response;
  try {
    // A fixed Cloudinary allowlist removes attacker-controlled DNS entirely. Redirects
    // are forbidden, so every network target is the validated URL above.
    upstream = await fetch(source, {
      headers: { "user-agent": "EditorsChoiceMediaDownloader/2.0", accept: "image/*,video/*,audio/*" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Media download upstream request failed", error);
    return NextResponse.json({ error: "Failed to fetch media file." }, { status: 502 });
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0];
  if (!upstream.ok || !upstream.body || !ALLOWED_CONTENT_TYPES.test(contentType) || !Number.isFinite(contentLength) || contentLength > MAX_DOWNLOAD_BYTES) {
    return NextResponse.json({ error: "This media source cannot be downloaded." }, { status: 400 });
  }

  const filename = searchParams.get("filename") ? sanitizeFilename(searchParams.get("filename")!) : getFilenameFromUrl(source.toString());
  return new NextResponse(upstream.body, { status: 200, headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
