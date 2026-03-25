import dns from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"];

const sanitizeFilename = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "media-file";

const getFilenameFromUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.split("/").filter(Boolean).pop() || "media-file";
    return sanitizeFilename(decodeURIComponent(pathname));
  } catch {
    return "media-file";
  }
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (BLOCKED_HOSTS.has(normalized)) return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const isPrivateIpv4 = (address: string) => {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
};

const isPrivateIpv6 = (address: string) => {
  const normalized = address.trim().toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
    normalized.startsWith("::ffff:169.254.")
  );
};

const isBlockedAddress = (address: string) => {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
};

const ensurePublicHostname = async (hostname: string) => {
  if (isBlockedHostname(hostname)) {
    throw new Error("Blocked host");
  }

  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new Error("Blocked IP address");
    }
    return;
  }

  const lookups = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!lookups.length || lookups.some((entry) => isBlockedAddress(entry.address))) {
    throw new Error("Blocked resolved address");
  }
};

async function requireSession() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
  const sessionRes = await supabaseAuth.auth.getSession();
  return sessionRes.data.session;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("url") || "";
  const requestedName = searchParams.get("filename") || "";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
  }

  if (![
    "http:",
    "https:",
  ].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Unsupported media source." }, { status: 400 });
  }

  try {
    await ensurePublicHostname(parsedUrl.hostname);
  } catch {
    return NextResponse.json({ error: "Unsupported media source." }, { status: 400 });
  }

  const filename = requestedName
    ? sanitizeFilename(requestedName)
    : getFilenameFromUrl(parsedUrl.toString());

  const upstream = await fetch(parsedUrl.toString(), {
    headers: {
      "user-agent": "EditorsChoiceMediaDownloader/1.0",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch media file." }, { status: 502 });
  }

  const responseUrl = upstream.url || parsedUrl.toString();
  try {
    const finalUrl = new URL(responseUrl);
    await ensurePublicHostname(finalUrl.hostname);
  } catch {
    return NextResponse.json({ error: "Unsupported media source." }, { status: 400 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (contentType.startsWith("text/html")) {
    return NextResponse.json({ error: "This media source cannot be downloaded directly." }, { status: 400 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
