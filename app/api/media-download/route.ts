import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";

export const runtime = "nodejs";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

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

const buildAudioFilename = (value: string) => {
  const safe = sanitizeFilename(value).replace(/\.[a-z0-9]+$/i, "");
  return `${safe || "media-file"}.mp3`;
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
  const extractAudio = searchParams.get("extract") === "audio";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol) || BLOCKED_HOSTS.has(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Unsupported media source." }, { status: 400 });
  }

  const filename = requestedName
    ? sanitizeFilename(requestedName)
    : getFilenameFromUrl(parsedUrl.toString());

  if (extractAudio) {
    if (!ffmpegPath) {
      return NextResponse.json(
        { error: "Audio extraction is not available on this deployment." },
        { status: 503 },
      );
    }

    const audioFilename = buildAudioFilename(filename);
    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-i",
        parsedUrl.toString(),
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        "192k",
        "-f",
        "mp3",
        "pipe:1",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", (error) => {
      console.error("Failed to start ffmpeg for audio extraction:", error);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        console.error("ffmpeg audio extraction failed:", stderr || `exit code ${code}`);
      }
    });

    return new NextResponse(Readable.toWeb(ffmpeg.stdout) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${audioFilename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const upstream = await fetch(parsedUrl.toString(), {
    headers: {
      "user-agent": "EditorsChoiceMediaDownloader/1.0",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch media file." }, { status: 502 });
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

