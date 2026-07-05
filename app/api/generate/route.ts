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

10. STRICT QUALITY FILTER:
If a song is even slightly mismatched,
DO NOT include it.

JSON FORMAT:
[
  {
    "title": "Song Name - Artist",
    "viral_para": "Perfect beat drop for cinematic transitions.",
    "timestamp": "00:32",
    "tip": "Use speed ramp on beat drop."
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

      let lastData: GeminiResponseData | null =
        null;

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

    const cleanJson = rawText
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(
      cleanJson,
    ) as unknown;

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

    const uniqueSongs = Array.from(
      new Map(
        parsed.map((song) => [
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

    const enriched =
      await Promise.all(
        uniqueSongs.map(
          async (song) => {
            const nextSong =
              song as SongLike;

            const hasPreview =
              typeof nextSong.previewUrl ===
                "string" ||
              typeof nextSong.preview_url ===
                "string";

            if (hasPreview) {
              return nextSong;
            }

            const previewData =
              await fetchPreviewData(
                String(
                  nextSong.title || "",
                ),
              );

            return {
              ...nextSong,

              ...(previewData.previewUrl
                ? {
                    previewUrl:
                      previewData.previewUrl,
                  }
                : {}),

              ...(previewData.artworkUrl
                ? {
                    artworkUrl:
                      previewData.artworkUrl,
                  }
                : {}),
            };
          },
        ),
      );

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
