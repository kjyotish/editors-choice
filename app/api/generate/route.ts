import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Force Next.js to treat this as a dynamic API route
export const dynamic = "force-dynamic";

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
let lastAlertAt = 0;

// Send an admin alert email with basic throttling.
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

// Generate song ideas via Gemini and enrich with preview data.
export async function POST(req: Request) {
  try {
    const { category, feeling, vibeTag, tags, language, searchMode } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is missing from .env.local");
      await sendAdminAlert(
        "EditorsChoice: Gemini API key missing",
        "GEMINI_API_KEY is missing. Requests cannot be processed until it is set."
      );
      return NextResponse.json(
        { error: "API Key not configured" },
        { status: 500 },
      );
    }

    // ✅ TARGETING GEMINI 2.5 FLASH ON THE STABLE V1 ENDPOINT
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestNonce = new Date().toISOString();
    const aiPrompt = `Generate a JSON array of 10 ${language} songs that match these inputs:
Category: ${category}
Feeling: ${feeling}
Vibe tag: ${vibeTag}
Language: ${language}
Tags: ${Array.isArray(tags) && tags.length ? tags.join(", ") : "none"}
Request nonce: ${requestNonce}

Guidelines:
- Only pick songs that strictly match the inputs above. Do not mix unrelated genres or categories.
- All 10 songs must match the category, feeling, vibe tag, and language. If any song doesn't match, replace it.
- If unsure, prefer songs that clearly match the category + feeling + vibe tag.
- Always provide a fresh set of songs for each request. Avoid repeating songs commonly suggested for similar prompts.
- Do not repeat the same song title or artist within the same response.
- Prefer recently popular or newly trending songs when possible, while still matching the inputs.
- "viral_para" should be a short 1–2 line hook about why this song works for the edit.
- "timestamp" should be the best cut point (mm:ss).
- "tip" should be a concise editing tip for this song.

Return ONLY a JSON array of objects with these exact keys: "title", "viral_para", "timestamp", "tip".
Do not include markdown backticks or any introductory text.`;

    const prompt = aiPrompt;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Gemini API Error:", data);
      const errorMessage = String(data?.error?.message || "");
      const isQuota =
        response.status === 429 ||
        /quota|resource_exhausted|rate/i.test(errorMessage);
      if (isQuota) {
        await sendAdminAlert(
          "EditorsChoice: Gemini quota exhausted",
          `Gemini API quota appears exhausted or rate-limited.\nStatus: ${response.status}\nMessage: ${errorMessage}`
        );
      }
      return NextResponse.json(
        { error: data.error?.message || "Gemini API Error" },
        { status: response.status },
      );
    }

    // Safe extraction of the text content
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty response from AI");

    // Clean up any potential markdown formatting the AI might add
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const songData = JSON.parse(cleanJson);

    if (!Array.isArray(songData)) {
      return NextResponse.json(songData);
    }

    const fetchPreviewData = async (title: string) => {
      if (!title) return "";
      const query = encodeURIComponent(title);
      const itunesUrl = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`;
      try {
        const itunesRes = await fetch(itunesUrl, { cache: "no-store" });
        if (!itunesRes.ok) return "";
        const itunesData = await itunesRes.json();
        const result = itunesData?.results?.[0];
        if (!result) return "";
        return {
          previewUrl: result.previewUrl || "",
          artworkUrl: result.artworkUrl100 || result.artworkUrl60 || "",
        };
      } catch {
        return "";
      }
    };

    const enriched = await Promise.all(
      songData.map(async (song: any) => {
        if (song.previewUrl || song.preview_url) return song;
        const previewData = await fetchPreviewData(String(song.title || ""));
        if (!previewData) return song;
        return {
          ...song,
          ...(previewData.previewUrl ? { previewUrl: previewData.previewUrl } : {}),
          ...(previewData.artworkUrl ? { artworkUrl: previewData.artworkUrl } : {}),
        };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("❌ Server Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
