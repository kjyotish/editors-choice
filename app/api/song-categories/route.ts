import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { buildJsonResponse } from "@/app/lib/requestRuntime";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import {
  createSongCategoryLabel,
  defaultSongCategories,
  mergeSongCategories,
  normalizeSongCategoryKey,
  type SongCategory,
} from "@/app/songs/songTypes";

type SongCategoryPayload = {
  key?: string;
  label?: string;
  description?: string | null;
};

const TABLE = "song_categories" as const;

const isDefaultCategoryKey = (key: string) =>
  defaultSongCategories.some((category) => category.key === key);

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return buildJsonResponse(defaultSongCategories, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .order("label", { ascending: true });

    if (error) {
      return buildJsonResponse(defaultSongCategories, undefined, "public, s-maxage=300, stale-while-revalidate=600");
    }

    const customCategories = (data || []) as SongCategory[];
    return buildJsonResponse(
      mergeSongCategories(defaultSongCategories, customCategories),
      undefined,
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  } catch {
    return buildJsonResponse(defaultSongCategories, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }
}

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500 },
    );
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SongCategoryPayload;
    const rawKey = normalizeSongCategoryKey(String(body?.key || body?.label || ""));
    const label = String(body?.label || "").trim() || createSongCategoryLabel(rawKey);
    const description = String(body?.description || "").trim();

    if (!rawKey) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    if (isDefaultCategoryKey(rawKey)) {
      return NextResponse.json({ error: "That category already exists." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(
        {
          key: rawKey,
          label,
          description: description || null,
        },
        { onConflict: "key" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save category." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save category." }, { status: 500 });
  }
}
