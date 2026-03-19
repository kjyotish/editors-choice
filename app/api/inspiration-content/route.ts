import { NextResponse } from "next/server";
import { getSupabaseAdmin, type Database } from "@/app/lib/supabaseAdmin";
import { requireAdminSession } from "@/app/lib/authServer";
import {
  buildJsonResponse,
  consumeRateLimit,
  fetchWithTimeout,
  getCachedValue,
  getClientIp,
  setCachedValue,
} from "@/app/lib/requestRuntime";

const TABLE = "inspiration_content" as const;
const PUBLIC_CACHE_KEY = "inspiration-content:published";
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const NLP_TIMEOUT_MS = 8_000;
const VIEW_RATE_LIMIT = 60;
const VIEW_RATE_WINDOW_MS = 60 * 1000;

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type Block =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Json };

type InspirationPayload = {
  id?: string;
  title: string;
  subtitle?: string;
  summary?: string;
  blocks?: Block[];
  keywords?: string[];
  published?: boolean;
  sortOrder?: number;
};

type InspirationRow = Database["public"]["Tables"]["inspiration_content"]["Row"];

const sanitizeText = (value: unknown) => String(value || "").trim();

const sanitizeBlock = (block: unknown): Block | null => {
  if (!block || typeof block !== "object" || !("type" in block)) return null;
  const type = String((block as { type?: unknown }).type || "") as Block["type"];

  if (type === "title" || type === "subtitle" || type === "paragraph") {
    const text = sanitizeText((block as { text?: unknown }).text);
    return text ? { type, text } : null;
  }

  if (type === "video" || type === "music" || type === "image" || type === "svg") {
    const url = sanitizeText((block as { url?: unknown }).url);
    const caption = sanitizeText((block as { caption?: unknown }).caption);
    if (!url) return null;
    return {
      type,
      url,
      ...(caption ? { caption } : {}),
    };
  }

  if (type === "chips" || type === "keywords") {
    const rawItems = (block as { items?: unknown[] }).items;
    const items = Array.isArray(rawItems)
      ? rawItems.map((item) => sanitizeText(item)).filter(Boolean)
      : [];
    return items.length ? { type, items } : null;
  }

  if (type === "custom") {
    const data = (block as { data?: Json }).data;
    if (!data || typeof data !== "object") return null;
    return {
      type: "custom",
      data: JSON.parse(JSON.stringify(data)) as Json,
    };
  }

  return null;
};

const sanitizeBlocks = (blocks: unknown) => {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((block) => sanitizeBlock(block))
    .filter((block): block is Block => Boolean(block));
};

const sanitizeKeywords = (keywords: unknown) => {
  if (!Array.isArray(keywords)) return [];
  return Array.from(
    new Set(
      keywords
        .map((keyword) => sanitizeText(keyword).toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);
};

const getSearchableKeywords = (item: {
  keywords?: string[] | null;
  blocks?: unknown;
}) => {
  const directKeywords = Array.isArray(item.keywords) ? item.keywords : [];
  const sanitizedBlocks = Array.isArray(item.blocks)
    ? item.blocks
        .map((block) => sanitizeBlock(block))
        .filter((block): block is Block => Boolean(block))
    : [];
  const blockKeywords = sanitizedBlocks.flatMap((block) =>
    block.type === "chips" || block.type === "keywords" ? block.items : [],
  );

  return Array.from(
    new Set(
      [...directKeywords, ...blockKeywords]
        .map((keyword) => sanitizeText(keyword).toLowerCase())
        .filter(Boolean),
    ),
  );
};

const buildSeoDefaults = (payload: InspirationPayload) => {
  const title = payload.title.trim();
  const subtitle = payload.subtitle?.trim() || "";
  const summary = payload.summary?.trim() || "";
  const descriptionSource = summary || subtitle || title;
  const description = descriptionSource.slice(0, 160);
  const seoTitle = `${title} | Inspiration`;
  return { seoTitle, description };
};

const clearPublicContentCache = () => {
  setCachedValue(PUBLIC_CACHE_KEY, [], 1);
};

const extractKeywords = async (text: string, apiKey: string) => {
  const endpoint = `https://language.googleapis.com/v1/documents:analyzeEntities?key=${apiKey}`;
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: { type: "PLAIN_TEXT", content: text },
        encodingType: "UTF8",
      }),
    },
    NLP_TIMEOUT_MS,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as {
    entities?: { name?: string; salience?: number }[];
  };
  const keywords =
    data.entities
      ?.filter((entity) => entity.name)
      .sort((a, b) => (b.salience || 0) - (a.salience || 0))
      .slice(0, 12)
      .map((entity) => String(entity.name)) || [];
  return Array.from(new Set(keywords));
};

async function requireSession() {
  return requireAdminSession();
}

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const keywordQuery = sanitizeText(searchParams.get("q")).toLowerCase();
  const limitParam = Number(searchParams.get("limit") || "");
  const offsetParam = Number(searchParams.get("offset") || "");
  const hasPaging = Number.isFinite(limitParam) && limitParam > 0;
  const limit = hasPaging ? Math.min(limitParam, 24) : null;

  const offset =
    Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  if (!all && !hasPaging) {
    const cached = getCachedValue<unknown[]>(PUBLIC_CACHE_KEY);
    if (cached) {
      return buildJsonResponse(cached, undefined, "public, s-maxage=300, stale-while-revalidate=600");
    }
  }

  if (all) {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let query = supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!all) {
    query = query.eq("published", true);
  }

  if (limit !== null && !(keywordQuery && !all)) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!all && !hasPaging) {
    setCachedValue(PUBLIC_CACHE_KEY, data || [], PUBLIC_CACHE_TTL_MS);
  }

  if (!all && limit !== null) {
    const sourceItems: InspirationRow[] = (data || []) as InspirationRow[];
    const filteredItems = keywordQuery
      ? sourceItems.filter((item) => {
          const titleMatches = sanitizeText(item.title).toLowerCase().includes(keywordQuery);
          return (
            titleMatches ||
            getSearchableKeywords(item).some((keyword) => keyword.includes(keywordQuery))
          );
        })
      : sourceItems;
    const total = filteredItems.length;
    const items = keywordQuery
      ? filteredItems.slice(offset, offset + limit)
      : filteredItems;

    return buildJsonResponse(
      {
        items,
        total,
        offset,
        limit,
        hasMore: offset + items.length < total,
      },
      undefined,
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  }

  return buildJsonResponse(
    data || [],
    undefined,
    all ? "private, max-age=0, must-revalidate" : "public, s-maxage=300, stale-while-revalidate=600",
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server is missing Supabase admin credentials." },
        { status: 500 },
      );
    }

    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as InspirationPayload;
    const title = sanitizeText(body?.title);
    const subtitle = sanitizeText(body?.subtitle);
    const summary = sanitizeText(body?.summary);
    const blocks = sanitizeBlocks(body?.blocks);
    const keywords = sanitizeKeywords(body?.keywords);
    const published = Boolean(body?.published);
    const sortOrder =
      typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    if (published && keywords.length === 0) {
      return NextResponse.json(
        { error: "Keywords are required before publishing." },
        { status: 400 },
      );
    }

    const payload: InspirationPayload = {
      title,
      subtitle: subtitle || undefined,
      summary: summary || undefined,
      blocks,
      keywords,
      published,
      sortOrder: sortOrder === null ? undefined : sortOrder,
    };

    let seoTitle: string | null = null;
    let seoDescription: string | null = null;
    let seoKeywords: string[] | null = null;
    let seoUpdatedAt: string | null = null;
    const nlApiKey = process.env.GOOGLE_NL_API_KEY || "";

    if (published && nlApiKey) {
      try {
        const text = [title, subtitle, summary, JSON.stringify(blocks)].join("\n");
        const defaults = buildSeoDefaults(payload);
        seoTitle = defaults.seoTitle;
        seoDescription = defaults.description;
        seoKeywords = await extractKeywords(text, nlApiKey);
        seoUpdatedAt = new Date().toISOString();
      } catch (error) {
        console.error("Failed to generate SEO metadata for inspiration content:", error);
      }
    }

    const insertRes = await supabaseAdmin
      .from(TABLE)
      .insert({
        title,
        subtitle: subtitle || null,
        summary: summary || null,
        blocks: blocks as Json,
        keywords,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
        seo_updated_at: seoUpdatedAt,
        published,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (insertRes.error || !insertRes.data) {
      return NextResponse.json(
        { error: insertRes.error?.message || "Failed to save content" },
        { status: 500 },
      );
    }

    clearPublicContentCache();
    return NextResponse.json(insertRes.data, { status: 201 });
  } catch (error) {
    console.error("Failed to save inspiration content:", error);
    return NextResponse.json(
      { error: "Failed to save content" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server is missing Supabase admin credentials." },
        { status: 500 },
      );
    }

    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as InspirationPayload;
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const title = sanitizeText(body?.title);
    const subtitle = sanitizeText(body?.subtitle);
    const summary = sanitizeText(body?.summary);
    const blocks = sanitizeBlocks(body?.blocks);
    const keywords = sanitizeKeywords(body?.keywords);
    const published = Boolean(body?.published);
    const sortOrder =
      typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    if (published && keywords.length === 0) {
      return NextResponse.json(
        { error: "Keywords are required before publishing." },
        { status: 400 },
      );
    }

    const payload: InspirationPayload = {
      id,
      title,
      subtitle: subtitle || undefined,
      summary: summary || undefined,
      blocks,
      keywords,
      published,
      sortOrder: sortOrder === null ? undefined : sortOrder,
    };

    const { data: existing } = await supabaseAdmin
      .from(TABLE)
      .select("published")
      .eq("id", id)
      .maybeSingle();

    const shouldGenerateSeo =
      published && existing?.published !== published;

    let seoTitle: string | null = null;
    let seoDescription: string | null = null;
    let seoKeywords: string[] | null = null;
    let seoUpdatedAt: string | null = null;
    const nlApiKey = process.env.GOOGLE_NL_API_KEY || "";

    if (shouldGenerateSeo && nlApiKey) {
      try {
        const text = [title, subtitle, summary, JSON.stringify(blocks)].join("\n");
        const defaults = buildSeoDefaults(payload);
        seoTitle = defaults.seoTitle;
        seoDescription = defaults.description;
        seoKeywords = await extractKeywords(text, nlApiKey);
        seoUpdatedAt = new Date().toISOString();
      } catch (error) {
        console.error("Failed to refresh SEO metadata for inspiration content:", error);
      }
    }

    const updateRes = await supabaseAdmin
      .from(TABLE)
      .update({
        title,
        subtitle: subtitle || null,
        summary: summary || null,
        blocks: blocks as Json,
        keywords,
        seo_title: seoTitle ?? undefined,
        seo_description: seoDescription ?? undefined,
        seo_keywords: seoKeywords ?? undefined,
        seo_updated_at: seoUpdatedAt ?? undefined,
        published,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json(
        { error: updateRes.error?.message || "Failed to update content" },
        { status: 500 },
      );
    }

    clearPublicContentCache();
    return NextResponse.json(updateRes.data, { status: 200 });
  } catch (error) {
    console.error("Failed to update inspiration content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  clearPublicContentCache();
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }

  const rateLimit = consumeRateLimit(
    `inspiration-view:${getClientIp(req)}`,
    VIEW_RATE_LIMIT,
    VIEW_RATE_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many view updates. Please try again shortly." },
      { status: 429 },
    );
  }

  try {
    const body = (await req.json()) as { id?: unknown; action?: unknown };
    const id = sanitizeText(body?.id);
    const action = sanitizeText(body?.action);

    if (!id || action !== "increment-view") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(TABLE)
      .select("id, published, view_count")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing || !existing.published) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const nextViewCount = Number(existing.view_count || 0) + 1;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        view_count: nextViewCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, view_count")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to update views." },
        { status: 500 },
      );
    }

    clearPublicContentCache();
    return NextResponse.json(
      { id: data.id, view_count: Number(data.view_count || 0) },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to update views." },
      { status: 500 },
    );
  }
}


