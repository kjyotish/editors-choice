import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  buildJsonResponse,
  fetchWithTimeout,
  getCachedValue,
  setCachedValue,
} from "@/app/lib/requestRuntime";

const TABLE = "inspiration_content" as const;
const PUBLIC_CACHE_KEY = "inspiration-content:published";
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const NLP_TIMEOUT_MS = 8_000;

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
    const items = Array.isArray((block as { items?: unknown[] }).items)
      ? (block as { items?: unknown[] }).items
          .map((item) => sanitizeText(item))
          .filter(Boolean)
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
    if (keywordQuery) {
      query = query.or(
        `keywords.cs.{${keywordQuery}},title.ilike.%${keywordQuery}%,summary.ilike.%${keywordQuery}%`,
      );
    }
  }

  if (limit !== null) {
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
    const countQuery = supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("published", true);
    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const items = data || [];
    return buildJsonResponse(
      {
        items,
        total: count || 0,
        offset,
        limit,
        hasMore: offset + items.length < (count || 0),
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
