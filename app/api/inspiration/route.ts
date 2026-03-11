import { NextResponse } from "next/server";
import { getSupabaseAdmin, type Database } from "@/app/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  buildJsonResponse,
  consumeRateLimit,
  getCachedValue,
  getClientIp,
  setCachedValue,
} from "@/app/lib/requestRuntime";

export const dynamic = "force-dynamic";

type Insight = {
  id: string;
  title: string;
  trend: string;
  psychology: string;
  usage: string;
  platforms: string;
  mediaUrl?: string;
  mediaDataUrl?: string;
  createdAt: string;
};

const TABLE = "inspiration_insights" as const;
const PUBLIC_CACHE_KEY = "inspiration-insights:list";
const PUBLIC_CACHE_TTL_MS = 2 * 60 * 1000;
const WRITE_LIMIT = 10;
const WRITE_WINDOW_MS = 60 * 1000;
type InsightRow = Database["public"]["Tables"]["inspiration_insights"]["Row"];
type InsightInsert = Database["public"]["Tables"]["inspiration_insights"]["Insert"];

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") || "");
  const offsetParam = Number(searchParams.get("offset") || "");
  const hasPaging = Number.isFinite(limitParam) && limitParam > 0;
  const limit = hasPaging ? Math.min(limitParam, 24) : null;
  const offset =
    Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  const cached = getCachedValue<Insight[]>(PUBLIC_CACHE_KEY);
  if (cached && !hasPaging) {
    return buildJsonResponse(cached, undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  let query = supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (limit !== null) {
    query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as InsightRow[];
  const items: Insight[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      trend: row.trend,
      psychology: row.psychology,
      usage: row.usage,
      platforms: row.platforms,
      mediaUrl: row.media_url || undefined,
      mediaDataUrl: row.media_data_url || undefined,
      createdAt: row.created_at,
    }));

  if (!hasPaging) {
    setCachedValue(PUBLIC_CACHE_KEY, items, PUBLIC_CACHE_TTL_MS);
    return buildJsonResponse(items, undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  const countQuery = await supabaseAdmin
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (countQuery.error) {
    return NextResponse.json({ error: countQuery.error.message }, { status: 500 });
  }

  return buildJsonResponse(
    {
      items,
      total: countQuery.count || 0,
      offset,
      limit,
      hasMore: offset + items.length < (countQuery.count || 0),
    },
    undefined,
    "public, s-maxage=120, stale-while-revalidate=300",
  );
}

export async function POST(req: Request) {
  try {
    const rateLimit = consumeRateLimit(
      `inspiration-write:${getClientIp(req)}`,
      WRITE_LIMIT,
      WRITE_WINDOW_MS,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server is missing Supabase admin credentials." },
        { status: 500 },
      );
    }
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
    const session = sessionRes.data.session;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const trend = String(body?.trend || "").trim();
    const psychology = String(body?.psychology || "").trim();
    const usage = String(body?.usage || "").trim();
    const platforms = String(body?.platforms || "").trim();
    const mediaUrl = String(body?.mediaUrl || "").trim();
    const mediaDataUrl = String(body?.mediaDataUrl || "").trim();

    if (!title || !trend || !psychology || !usage || !platforms) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const next: InsightInsert = {
      title,
      trend,
      psychology,
      usage,
      platforms,
      media_url: mediaUrl || null,
      media_data_url: mediaDataUrl || null,
    };

    const insertRes = await supabaseAdmin
      .from(TABLE)
      .insert(next)
      .select("*")
      .single();

    if (insertRes.error || !insertRes.data) {
      return NextResponse.json(
        { error: insertRes.error?.message || "Failed to save insight" },
        { status: 500 },
      );
    }

    const insertData = insertRes.data as InsightRow;
    const created: Insight = {
      id: insertData.id,
      title: insertData.title,
      trend: insertData.trend,
      psychology: insertData.psychology,
      usage: insertData.usage,
      platforms: insertData.platforms,
      mediaUrl: insertData.media_url || undefined,
      mediaDataUrl: insertData.media_data_url || undefined,
      createdAt: insertData.created_at,
    };

    setCachedValue(PUBLIC_CACHE_KEY, null, 1);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save insight" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const rateLimit = consumeRateLimit(
    `inspiration-write:${getClientIp(req)}`,
    WRITE_LIMIT,
    WRITE_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }
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
  const session = sessionRes.data.session;
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
  setCachedValue(PUBLIC_CACHE_KEY, null, 1);
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PUT(req: Request) {
  const rateLimit = consumeRateLimit(
    `inspiration-write:${getClientIp(req)}`,
    WRITE_LIMIT,
    WRITE_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }
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
  const session = sessionRes.data.session;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const title = String(body?.title || "").trim();
  const trend = String(body?.trend || "").trim();
  const psychology = String(body?.psychology || "").trim();
  const usage = String(body?.usage || "").trim();
  const platforms = String(body?.platforms || "").trim();
  const mediaUrl = String(body?.mediaUrl || "").trim();
  const mediaDataUrl = String(body?.mediaDataUrl || "").trim();

  if (!title || !trend || !psychology || !usage || !platforms) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const next: InsightInsert = {
    title,
    trend,
    psychology,
    usage,
    platforms,
    media_url: mediaUrl || null,
    media_data_url: mediaDataUrl || null,
  };

  const updateRes = await supabaseAdmin
    .from(TABLE)
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  if (updateRes.error || !updateRes.data) {
    return NextResponse.json(
      { error: updateRes.error?.message || "Failed to update insight" },
      { status: 500 },
    );
  }

  const insertData = updateRes.data as InsightRow;
  const updated: Insight = {
    id: insertData.id,
    title: insertData.title,
    trend: insertData.trend,
    psychology: insertData.psychology,
    usage: insertData.usage,
    platforms: insertData.platforms,
    mediaUrl: insertData.media_url || undefined,
    mediaDataUrl: insertData.media_data_url || undefined,
    createdAt: insertData.created_at,
  };

  setCachedValue(PUBLIC_CACHE_KEY, null, 1);
  return NextResponse.json(updated, { status: 200 });
}
