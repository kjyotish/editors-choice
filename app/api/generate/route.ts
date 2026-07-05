import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  consumeRateLimit,
  fetchWithTimeout,
  getCachedValue,
  getClientIp,
  setCachedValue,
} from "@/app/lib/requestRuntime";
import { parseSongResponse } from "./parseSongResponse.js";

type GeneratePayload = {
  category: string;
  feeling: string;
  vibeTag: string;
  tags: string[];
  language: string;
  version: string;
  excludeTitles: string[];
  useAltKey: boolean;
};

type SongLike = {
  title: string;
  viral_para: string;
  timestamp: string;
  tip: string;
  yt_link?: string;
  previewUrl?: string;
  preview_url?: string;
  artworkUrl?: string;
};

type GeminiResponseData = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GENERATE_TIMEOUT_MS = 40_000;
const GENERATE_CACHE_TTL_MS = 30 * 60 * 1000;
const GENERATE_RATE_LIMIT = 6;
const GENERATE_RATE_WINDOW_MS = 60 * 1000;

const inFlightGenerateRequests = new Map<string, Promise<SongLike[]>>();

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
};

const buildRequestKey = (payload: GeneratePayload) =>
  JSON.stringify({
    category: payload.category.trim().toLowerCase(),
    feeling: payload.feeling.trim().toLowerCase(),
    vibeTag: payload.vibeTag.trim().toLowerCase(),
    tags: payload.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).sort(),
    language: payload.language.trim().toLowerCase(),
    version: payload.version.trim().toLowerCase(),
    excludeTitles: payload.excludeTitles.map((title) => title.trim().toLowerCase()).filter(Boolean).sort(),
    useAltKey: Boolean(payload.useAltKey),
  });

async function sendAdminAlert(subject: string, message: string) {
  const smtpHost = getEnv("SMTP_HOST");
  const smtpPort = getEnv("SMTP_PORT");
  const smtpUser = getEnv("SMTP_USER");
  const smtpPass = getEnv("SMTP_PASS");
  const smtpTo = getEnv("SMTP_TO");

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpTo) {
    console.error(subject, message);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `EditorsChoice <${smtpUser}>`,
    to: smtpTo,
    subject,
    text: message,
  });
}

async function generateSongs(payload: GeneratePayload) {
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
    const requestNonce = new Date().toISOString();

    const freshnessSeed = Math.random()
      .toString(36)
      .slice(2);

    const moodContextMap: Record<string, string> = {
      sad: "emotional, heartbreak, slow, deep",
      gym: "hard, energetic, aggressive, motivational",
      luxury: "premium, rich, classy, stylish",
      travel: "cinematic, freedom, dreamy",
      romantic: "soft, love, emotional",
      dark: "phonk, bass, mysterious",
      bike: "phonk, drift, aggressive, bass-heavy",
      car: "trap, phonk, racing energy",
      fashion: "stylish, trendy, aesthetic",
      cinematic: "dramatic, orchestral, emotional",
    };

    const extraMoodContext =
      moodContextMap[
        payload.category.toLowerCase()
      ] || "";

    const aiPrompt = `
You are a professional music curator for short-form video editors.

Your task is to generate HIGHLY ACCURATE song recommendations for reel/video editing.

OUTPUT RULES:
- Return ONLY valid JSON.
- No markdown.
- No explanations.
- No backticks.
- No intro text.
- No duplicate songs.
- No duplicate artists.
- No repeated vibe styles.
- Response must be a JSON array with EXACTLY 10 objects.

USER INPUTS:
Category: ${payload.category}
Feeling: ${payload.feeling}
Vibe Tag: ${payload.vibeTag}
Language: ${payload.language}
Version: ${payload.version}
Tags: ${
      payload.tags.length
        ? payload.tags.join(", ")
        : "none"
    }

Extra Mood Context:
${extraMoodContext}

Avoid Titles:
${
  payload.excludeTitles.length
    ? payload.excludeTitles
        .slice(0, 50)
        .join(", ")
    : "none"
}

REQUEST ID:
${requestNonce}

Freshness Seed:
${freshnessSeed}

SONG MATCHING RULES:
1. Every song MUST strongly match:
   - category
   - mood
   - edit vibe
   - language

2. NEVER include random trending songs that don't fit.

3. If category is:
   - gym -> energetic / hard / motivational
   - travel -> emotional / cinematic / freedom vibe
   - luxury -> classy / rich / premium vibe
   - sad -> emotional / heartbreak
   - romantic -> soft / love vibe
   - bike/car -> phonk / trap / drift / aggressive
   - fashion -> stylish / aesthetic / trendy
   - cinematic -> orchestral / dramatic / emotional

4. Prefer:
   - viral reels songs
   - trending TikTok/Instagram edit songs
   - recently popular edits
   - underrated hidden gems
   - remix edits if version=remix

5. Avoid:
   - outdated songs unless still viral
   - children's songs
   - devotional songs
   - unrelated genres
   - low-energy songs for hype edits

6. Song diversity:
   - mix mainstream + underrated
   - avoid same artist mood repetition
   - avoid same BPM feeling repeatedly

7. Timestamp Rules:
   - choose BEST drop/hook point
   - format mm:ss
   - must feel editable

8. viral_para:
   - maximum 2 short lines
   - explain WHY this song works for edits
   - must sound social-media focused

9. tip:
   - must be practical editing advice
   - short
   - useful for transitions/cuts/beats

10. yt_link:
   - if you know a direct YouTube link for the song, include it here
   - otherwise omit the field or use a search result URL

11. STRICT QUALITY FILTER:
If a song is even slightly mismatched,
DO NOT include it.

JSON FORMAT:
[
  {
    "title": "Song Name - Artist",
    "viral_para": "Perfect beat drop for cinematic transitions.",
    "timestamp": "00:32",
    "tip": "Use speed ramp on beat drop.",
    "yt_link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
]
`;

    async function callGemini(
      url: string,
      prompt: string,
    ) {
      const requestBodies = [
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
          },
        },

        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
      ];

      let lastStatus = 500;

      let lastData:
        | GeminiResponseData
        | undefined;

      for (
        let attempt = 0;
        attempt < requestBodies.length;
        attempt++
      ) {
        try {
          const response =
            await fetchWithTimeout(
              url,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  requestBodies[attempt],
                ),
              },
              GENERATE_TIMEOUT_MS,
            );

          const data =
            (await response.json()) as GeminiResponseData;

          if (response.ok) {
            return {
              response,
              data,
            };
          }

          lastStatus = response.status;
          lastData = data;

          if (
            response.status === 400 &&
            attempt <
              requestBodies.length - 1
          ) {
            continue;
          }

          break;
        } catch (err) {
          console.error(
            "Gemini request failed:",
            err,
          );
        }
      }

      return {
        response: {
          ok: false,
          status: lastStatus,
        },
        data: lastData,
      };
    }

    const models = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ];

    let response:
      | {
          ok: boolean;
          status: number;
        }
      | undefined;

    let data:
      | GeminiResponseData
      | undefined;

    for (const model of models) {
      try {
        const result =
          await callGemini(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
            aiPrompt,
          );

        if (result.response.ok) {
          response = result.response;
          data = result.data;
          break;
        }

        response = result.response;
        data = result.data;
      } catch (err) {
        console.error(
          `Model ${model} failed`,
          err,
        );
      }
    }

    if (!response || !data) {
      throw new Error(
        "All Gemini models failed",
      );
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" && data
          ? String(
              data.error?.message || "",
            )
          : "";

      const isQuota =
        response.status === 429 ||
        /quota|resource_exhausted|rate/i.test(
          errorMessage,
        );

      if (isQuota) {
        await sendAdminAlert(
          "EditorsChoice: Gemini quota exhausted",
          `Gemini API quota appears exhausted or rate-limited.\nStatus: ${response.status}\nMessage: ${errorMessage}`,
        );
      }

      const apiError = new Error(
        errorMessage ||
          "Gemini API Error",
      );

      (
        apiError as Error & {
          status?: number;
        }
      ).status = response.status;

      throw apiError;
    }

    const rawText =
      typeof data === "object" &&
      data &&
      "candidates" in data
        ? data.candidates?.[0]
            ?.content?.parts?.[0]?.text
        : undefined;

    if (!rawText) {
      throw new Error(
        "Empty response from AI",
      );
    }

    let parsed: unknown;
    let parseError: Error | undefined;

    try {
      parsed = parseSongResponse(rawText) as unknown;
    } catch (error) {
      parseError =
        error instanceof Error
          ? error
          : new Error("Failed to parse song response");

      console.warn(
        "Initial song response parse failed. Retrying with a stricter prompt.",
        parseError.message,
      );

      const retryPrompt = `${aiPrompt}\nIMPORTANT: Return ONLY a valid JSON array with EXACTLY 10 objects. Do not wrap it in markdown, code fences, or commentary. Use double quotes for all keys and string values.`;

      for (const model of models) {
        try {
          const retryResult = await callGemini(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
            retryPrompt,
          );

          if (retryResult.response.ok && retryResult.data) {
            const retryText =
              typeof retryResult.data === "object" &&
              retryResult.data &&
              "candidates" in retryResult.data
                ? retryResult.data.candidates?.[0]?.content?.parts?.[0]?.text
                : undefined;

            if (retryText) {
              parsed = parseSongResponse(retryText) as unknown;
              break;
            }
          }
        } catch (retryErr) {
          console.error("Retry parse attempt failed:", retryErr);
        }
      }

      if (typeof parsed === "undefined") {
        throw parseError;
      }
    }

    function validateSongs(
      data: unknown,
    ) {
      if (!Array.isArray(data))
        return false;

      return data.every((song) => {
        if (
          !song ||
          typeof song !== "object"
        ) {
          return false;
        }

        const s =
          song as Record<
            string,
            unknown
          >;

        return (
          typeof s.title ===
            "string" &&
          s.title.length > 2 &&
          typeof s.viral_para ===
            "string" &&
          typeof s.timestamp ===
            "string" &&
          /^\d{2}:\d{2}$/.test(
            s.timestamp,
          ) &&
          typeof s.tip ===
            "string"
        );
      });
    }

    if (!validateSongs(parsed)) {
      throw new Error(
        "AI returned malformed song data",
      );
    }

    const validatedSongs = parsed as SongLike[];

    const uniqueSongs = Array.from(
      new Map(
        validatedSongs.map((song: SongLike) => [
          String(
            (
              song as SongLike
            ).title,
          ).toLowerCase(),
          song,
        ]),
      ).values(),
    );

    if (uniqueSongs.length < 6) {
      throw new Error(
        "AI returned too many duplicate songs",
      );
    }

    const enriched = uniqueSongs.map((song) => ({ ...song }));

    setCachedValue(
      cacheKey,
      enriched,
      GENERATE_CACHE_TTL_MS,
    );

    return enriched;
  })();

  inFlightGenerateRequests.set(
    cacheKey,
    promise,
  );

  try {
    return await promise;
  } finally {
    inFlightGenerateRequests.delete(
      cacheKey,
    );
  }
}

export async function POST(req: Request) {
  const rateLimit = consumeRateLimit(
    `generate:${getClientIp(req)}`,
    GENERATE_RATE_LIMIT,
    GENERATE_RATE_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = (await req.json()) as Partial<GeneratePayload> & { useAltKey?: boolean };
    const payload: GeneratePayload = {
      category: String(body.category || "").trim(),
      feeling: String(body.feeling || "").trim(),
      vibeTag: String(body.vibeTag || "").trim(),
      tags: Array.isArray(body.tags)
        ? body.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [],
      language: String(body.language || "").trim(),
      version: String(body.version || "").trim(),
      excludeTitles: Array.isArray(body.excludeTitles)
        ? body.excludeTitles.map((title) => String(title || "").trim()).filter(Boolean)
        : [],
      useAltKey: Boolean(body.useAltKey),
    };

    if (!payload.category) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    const data = await generateSongs(payload);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate songs.";
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: number }).status) || 500
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
