import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { getSupabaseAdmin, type Database } from "@/app/lib/supabaseAdmin";
import {
  buildJsonResponse,
  getCachedValue,
  getClientIp,
  setCachedValue,
} from "@/app/lib/requestRuntime";
import { normalizePromptSubcategory } from "@/app/ai-prompts/promptCategories";
import {
  consumeSharedRateLimit,
  getSharedJson,
  setSharedJson,
} from "@/app/lib/upstashStore";

type SubcategoryRow = Database["public"]["Tables"]["ai_prompt_subcategories"]["Row"];
type PromptRow = Database["public"]["Tables"]["ai_prompts"]["Row"];

type SubcategoryPayload = {
  label?: string;
};

const sanitizeText = (value: unknown) => String(value || "").trim();
const PUBLIC_CACHE_KEY = "ai-prompts:subcategory-options";
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const WRITE_LIMIT = 20;
const WRITE_WINDOW_MS = 60 * 1000;

async function requireSession() {
  return requireAdminSession();
}

function uniqueLabels(values: Array<string | null | undefined>) {
  const map = new Map<string, string>();

  for (const rawValue of values) {
    const label = String(rawValue || "").trim();
    if (!label) continue;

    const normalized = normalizePromptSubcategory(label);
    if (!map.has(normalized)) {
      map.set(normalized, label);
    }
  }

  return Array.from(map.values()).sort((left, right) => left.localeCompare(right));
}

async function fallbackPromptSubcategories() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return [];
  }

  const { data } = await supabaseAdmin.from("ai_prompts").select("subcategory");
  const rows = (data || []) as PromptRow[];
  return uniqueLabels(rows.map((row) => row.subcategory));
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return buildJsonResponse([], undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  const cached = getCachedValue<string[] | null>(PUBLIC_CACHE_KEY);
  if (cached) {
    return buildJsonResponse(cached, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  const sharedCached = await getSharedJson<string[] | null>(PUBLIC_CACHE_KEY);
  if (sharedCached) {
    setCachedValue(PUBLIC_CACHE_KEY, sharedCached, PUBLIC_CACHE_TTL_MS);
    return buildJsonResponse(sharedCached, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_prompt_subcategories")
      .select("id,label,normalized_label,created_at,updated_at")
      .order("label", { ascending: true });

    if (error) {
      const fallback = await fallbackPromptSubcategories();
      setCachedValue(PUBLIC_CACHE_KEY, fallback, PUBLIC_CACHE_TTL_MS);
      void setSharedJson(PUBLIC_CACHE_KEY, fallback, PUBLIC_CACHE_TTL_MS);
      return buildJsonResponse(fallback, undefined, "public, s-maxage=300, stale-while-revalidate=600");
    }

    const items = uniqueLabels((data || []).map((item: SubcategoryRow) => item.label));
    setCachedValue(PUBLIC_CACHE_KEY, items, PUBLIC_CACHE_TTL_MS);
    void setSharedJson(PUBLIC_CACHE_KEY, items, PUBLIC_CACHE_TTL_MS);
    return buildJsonResponse(items, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  } catch {
    const fallback = await fallbackPromptSubcategories();
    setCachedValue(PUBLIC_CACHE_KEY, fallback, PUBLIC_CACHE_TTL_MS);
    void setSharedJson(PUBLIC_CACHE_KEY, fallback, PUBLIC_CACHE_TTL_MS);
    return buildJsonResponse(fallback, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }
}

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "The data service is temporarily unavailable." },
      { status: 500 },
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sharedRateLimit = await consumeSharedRateLimit(
    `ai-prompt-subcategories-write:${getClientIp(req)}`,
    WRITE_LIMIT,
    WRITE_WINDOW_MS,
  );
  const rateLimit =
    sharedRateLimit ?? { allowed: false, remaining: 0, resetAt: Date.now() };
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 },
    );
  }

  try {
    const body = (await req.json()) as SubcategoryPayload;
    const label = sanitizeText(body?.label);
    if (!label) {
      return NextResponse.json({ error: "Subcategory is required." }, { status: 400 });
    }

    const normalizedLabel = normalizePromptSubcategory(label);
    if (!normalizedLabel) {
      return NextResponse.json({ error: "Subcategory is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ai_prompt_subcategories")
      .upsert(
        {
          label,
          normalized_label: normalizedLabel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "normalized_label" },
      )
      .select("id,label,normalized_label,created_at,updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Unable to complete the request." },
        { status: 500 },
      );
    }

    const cached = getCachedValue<string[] | null>(PUBLIC_CACHE_KEY) || [];
    const nextItems = uniqueLabels([...cached, data.label]);
    setCachedValue(PUBLIC_CACHE_KEY, nextItems, PUBLIC_CACHE_TTL_MS);
    void setSharedJson(PUBLIC_CACHE_KEY, nextItems, PUBLIC_CACHE_TTL_MS);

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save subcategory." }, { status: 500 });
  }
}
