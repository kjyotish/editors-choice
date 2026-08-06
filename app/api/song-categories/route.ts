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

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

const isDefaultCategoryKey = (key: string) =>
  defaultSongCategories.some((category) => category.key === key);

const isMissingTableError = (error: { message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() || "";
  return (
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("schema cache")
  );
};

const ensureSongCategoriesTable = async (supabaseAdmin: SupabaseAdminClient) => {
  try {
    const { error } = await (
      supabaseAdmin as SupabaseAdminClient & {
        rpc: (name: string) => Promise<{ error: { message?: string } | null }>;
      }
    ).rpc("ensure_song_categories_table");

    return !error;
  } catch {
    return false;
  }
};

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

    if (error && isMissingTableError(error)) {
      const ensured = await ensureSongCategoriesTable(supabaseAdmin);
      if (ensured) {
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from(TABLE)
          .select("*")
          .order("label", { ascending: true });

        if (!retryError) {
          const customCategories = (retryData || []) as SongCategory[];
          return buildJsonResponse(
            mergeSongCategories(defaultSongCategories, customCategories),
            undefined,
            "public, s-maxage=300, stale-while-revalidate=600",
          );
        }
      }

      return buildJsonResponse(defaultSongCategories, undefined, "public, s-maxage=300, stale-while-revalidate=600");
    }

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

    let result = await supabaseAdmin
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

    if (result.error && isMissingTableError(result.error)) {
      const ensured = await ensureSongCategoriesTable(supabaseAdmin);
      if (!ensured) {
        return NextResponse.json(
          {
            error:
              "The song_categories table is missing in Supabase. Run the SQL from the project notes, then try again.",
          },
          { status: 500 },
        );
      }

      result = await supabaseAdmin
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
    }

    const { data, error } = result;

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
