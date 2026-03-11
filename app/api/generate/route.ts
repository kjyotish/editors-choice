import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  consumeRateLimit,
  fetchWithTimeout,
  getCachedValue,
  getClientIp,
  setCachedValue,
} from "@/app/lib/requestRuntime";

export const dynamic = "force-dynamic";

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const GENERATE_TIMEOUT_MS = 20_000;
const ITUNES_TIMEOUT_MS = 4_000;
const GENERATE_CACHE_TTL_MS = 5 * 60 * 1000;
const PREVIEW_CACHE_TTL_MS = 60 * 60 * 1000;
const GENERATE_RATE_LIMIT = 8;
const GENERATE_RATE_WINDOW_MS = 60 * 1000;

type SongLike = {
  title?: unknown;
  previewUrl?: unknown;
  preview_url?: unknown;
  artworkUrl?: unknown;
  [key: string]: unknown;
};

type PreviewLookup = {
  previewUrl?: string;
  artworkUrl?: string;
};

let lastAlertAt = 0;
const inFlightGenerateRequests = new Map<string, Promise<SongLike[]>>();

async function sendAdminAlert(subject: string, text: string) {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  lastAlertAt = now;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpTo = process.env.SMTP_TO;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpTo) return;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `EditorsChoice <${smtpUser}>`,
    to: smtpTo,
    subject,
    text,
  });
}

function normalizeArray(values: unknown, maxItems: number) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildRequestKey(payload: {
  category: string;
  feeling: string;
  vibeTag: string;
  tags: string[];
  language: string;
  version: string;
  excludeTitles: string[];
  useAltKey: boolean;
}) {
  return JSON.stringify({
    ...payload,
    tags: [...payload.tags].sort(),
    excludeTitles: [...payload.excludeTitles].sort(),
  });
}

async function fetchPreviewData(title: string) {
  if (!title) return {};

  const cacheKey = `preview:${title.toLowerCase()}`;
  const cached = getCachedValue<PreviewLookup>(cacheKey);
  if (cached) return cached;

  const query = encodeURIComponent(title);
  const itunesUrl = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`;

  try {
    const itunesRes = await fetchWithTimeout(
      itunesUrl,
      { cache: "no-store" },
      ITUNES_TIMEOUT_MS,
    );
    if (!itunesRes.ok) return {};

    const itunesData = (await itunesRes.json()) as {
      results?: {
        previewUrl?: string;
        artworkUrl100?: string;
        artworkUrl60?: string;
      }[];
    };

    const result = itunesData.results?.[0];
    if (!result) return {};

    const previewData = {
      previewUrl: result.previewUrl || "",
      artworkUrl: result.artworkUrl100 || result.artworkUrl60 || "",
    };

    setCachedValue(cacheKey, previewData, PREVIEW_CACHE_TTL_MS);
    return previewData;
  } catch {
    return {};
  }
}

async function generateSongs(payload: {
  category: string;
  feeling: string;
  vibeTag: string;
  tags: string[];
  language: string;
  version: string;
  excludeTitles: string[];
  useAltKey: boolean;
}) {
  const apiKey = payload.useAltKey
    ? process.env.GEMINI_API_KEY_2
    : process.env.GEMINI_API_KEY;

  if (!apiKey) {
    await sendAdminAlert(
      "EditorsChoice: Gemini API key missing",
      "GEMINI_API_KEY is missing. Requests cannot be processed until it is set.",
    );
    throw new Error("API Key not configured");
  }

  const cacheKey = `generate:${buildRequestKey(payload)}`;
  const cached = getCachedValue<SongLike[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const existingPromise = inFlightGenerateRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const requestNonce = new Date().toISOString();
    const aiPrompt = `Generate a JSON array of 10 ${payload.language} ${
      payload.version === "remix" ? "remixes" : "songs"
    } that match these inputs:
Category: ${payload.category}
Feeling: ${payload.feeling}
Vibe tag: ${payload.vibeTag}
Language: ${payload.language}
Version: ${payload.version === "remix" ? "Remix" : "Original"}
Tags: ${payload.tags.length ? payload.tags.join(", ") : "none"}
Avoid these song titles (recently shown to this user/device): ${
      payload.excludeTitles.length
        ? payload.excludeTitles.slice(0, 25).join(", ")
        : "none"
    }
Request nonce: ${requestNonce}

Guidelines:
- Only pick songs that strictly match the inputs above. Do not mix unrelated genres or categories.
- All 10 songs must match the category, feeling, vibe tag, and language. If any song doesn't match, replace it.
- If unsure, prefer songs that clearly match the category + feeling + vibe tag.
- Always provide a fresh set of songs for each request. Avoid repeating songs commonly suggested for similar prompts.
- Do not repeat the same song title or artist within the same response.
- Strictly avoid any titles listed in "Avoid these song titles".
- Prefer recently popular or newly trending songs when possible, while still matching the inputs.
- "viral_para" should be a short 1-2 line hook about why this song works for the edit.
- "timestamp" should be the best cut point (mm:ss).
- "tip" should be a concise editing tip for this song.

Return ONLY a JSON array of objects with these exact keys: "title", "viral_para", "timestamp", "tip".
Do not include markdown backticks or any introductory text.`;

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
        }),
      },
      GENERATE_TIMEOUT_MS,
    );

    const data: unknown = await response.json();

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" && data && "error" in data
          ? String((data as { error?: { message?: string } }).error?.message || "")
          : "";
      const isQuota =
        response.status === 429 ||
        /quota|resource_exhausted|rate/i.test(errorMessage);

      if (isQuota) {
        await sendAdminAlert(
          "EditorsChoice: Gemini quota exhausted",
          `Gemini API quota appears exhausted or rate-limited.\nStatus: ${response.status}\nMessage: ${errorMessage}`,
        );
      }

      const apiError = new Error(errorMessage || "Gemini API Error");
      (apiError as Error & { status?: number }).status = response.status;
      throw apiError;
    }

    const rawText =
      typeof data === "object" && data && "candidates" in data
        ? (data as {
            candidates?: {
              content?: { parts?: { text?: string }[] };
            }[];
          }).candidates?.[0]?.content?.parts?.[0]?.text
        : undefined;

    if (!rawText) {
      throw new Error("Empty response from AI");
    }

    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("AI returned invalid song data");
    }

    const enriched = await Promise.all(
      parsed.map(async (song) => {
        const nextSong = song as SongLike;
        const hasPreview =
          typeof nextSong.previewUrl === "string" ||
          typeof nextSong.preview_url === "string";
        if (hasPreview) return nextSong;

        const previewData = await fetchPreviewData(String(nextSong.title || ""));
        return {
          ...nextSong,
          ...(previewData.previewUrl ? { previewUrl: previewData.previewUrl } : {}),
          ...(previewData.artworkUrl ? { artworkUrl: previewData.artworkUrl } : {}),
        };
      }),
    );

    setCachedValue(cacheKey, enriched, GENERATE_CACHE_TTL_MS);
    return enriched;
  })();

  inFlightGenerateRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    inFlightGenerateRequests.delete(cacheKey);
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateLimit = consumeRateLimit(
    `generate:${ip}`,
    GENERATE_RATE_LIMIT,
    GENERATE_RATE_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1),
          ),
        },
      },
    );
  }

  try {
    const body = (await req.json()) as {
      category?: unknown;
      feeling?: unknown;
      vibeTag?: unknown;
      tags?: unknown;
      language?: unknown;
      version?: unknown;
      excludeTitles?: unknown;
      useAltKey?: unknown;
    };

    const payload = {
      category: String(body?.category || "").trim(),
      feeling: String(body?.feeling || "").trim(),
      vibeTag: String(body?.vibeTag || "").trim(),
      tags: normalizeArray(body?.tags, 12),
      language: String(body?.language || "Hindi").trim() || "Hindi",
      version: String(body?.version || "song").trim() || "song",
      excludeTitles: normalizeArray(body?.excludeTitles, 100),
      useAltKey: Boolean(body?.useAltKey),
    };

    if (!payload.category) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 },
      );
    }

    const enriched = await generateSongs(payload);
    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "The request timed out. Please try again." },
        { status: 504 },
      );
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
