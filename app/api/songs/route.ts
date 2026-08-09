import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { buildJsonResponse } from "@/app/lib/requestRuntime";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import {
  buildSongSearchText,
  clampSongRating,
  defaultSongCategories,
  getYouTubeEmbedUrl,
  normalizeSongSearchText,
  normalizeSongCategoryKey,
  scoreSongSearchQuery,
  mergeSongCategories,
  resolveSongCategoriesFromQuery,
  songMatchesSearchQuery,
  splitSongSearchTerms,
  type SongCategory,
} from "@/app/songs/songTypes";

const TABLE = "songs" as const;

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

type SongPayload = {
  id?: string;
  title?: string;
  artistName?: string;
  category?: string;
  rating?: number | null;
  youtubeUrl?: string;
  thumbnailUrl?: string | null;
  searchTerms?: string | null;
  published?: boolean;
  sortOrder?: number | null;
};

const sanitizeText = (value: unknown) => String(value || "").trim();

type SupabaseErrorLike = { message?: string | null } | null | undefined;

const isStaleSongCategoryConstraintError = (error: SupabaseErrorLike) => {
  const message = error?.message?.toLowerCase() || "";
  return (
    message.includes("songs_category_check") ||
    (message.includes("violates check constraint") && message.includes("category"))
  );
};

const getSongSaveErrorMessage = (error: SupabaseErrorLike, fallback: string) => {
  if (isStaleSongCategoryConstraintError(error)) {
    return "The songs table still has an old category check constraint. Run the SQL from supabase/songs.sql or supabase/schema.sql in your Supabase SQL editor, then try again.";
  }

  return error?.message || fallback;
};

const ensureSongCategoryConstraints = async (supabaseAdmin: SupabaseAdminClient) => {
  try {
    const { error } = await (
      supabaseAdmin as SupabaseAdminClient & {
        rpc: (name: string) => Promise<{ error: { message?: string } | null }>;
      }
    ).rpc("ensure_song_category_constraints");

    return !error;
  } catch {
    return false;
  }
};

const parseLimit = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(Math.max(Math.trunc(parsed), 1), 48);
};

async function requireSession() {
  return requireAdminSession();
}

const escapeLikePattern = (value: string) => value.replace(/([\\%_])/g, "\\$1");

async function loadSongCategories(supabaseAdmin: SupabaseAdminClient) {
  try {
    const { data, error } = await supabaseAdmin.from("song_categories").select("*").order("label", { ascending: true });
    if (error || !Array.isArray(data)) {
      return defaultSongCategories;
    }

    return mergeSongCategories(defaultSongCategories, data as SongCategory[]);
  } catch {
    return defaultSongCategories;
  }
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
  const id = sanitizeText(searchParams.get("id"));

  if (all) {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminQuery = supabaseAdmin
      .from(TABLE)
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    const { data, error } = id ? await adminQuery.eq("id", id) : await adminQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], { status: 200 });
  }

  if (id) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return buildJsonResponse(data || null, undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  const query = normalizeSongSearchText(sanitizeText(searchParams.get("query")));
  let category = normalizeSongCategoryKey(sanitizeText(searchParams.get("category")));
  const limit = parseLimit(searchParams.get("limit"));
  let searchQuery = query;
  let categoryKeys: string[] = category ? [category] : [];

  if (query) {
    const categories = await loadSongCategories(supabaseAdmin);
    const queryCategories = resolveSongCategoriesFromQuery(query, categories);
    if (queryCategories.length > 0) {
      categoryKeys = queryCategories.map((item) => item.key);
      category = categoryKeys[0] ?? "";
      searchQuery = "";
    }
  }

  if (!searchQuery && categoryKeys.length === 0) {
    return buildJsonResponse([], undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  let songQuery = supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("published", true)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (categoryKeys.length > 0) {
    songQuery = songQuery.in("category", categoryKeys);
  }

  if (searchQuery) {
    const queryFragments = Array.from(new Set([searchQuery, ...splitSongSearchTerms(searchQuery)]));
    const searchConditions = queryFragments
      .map(
        (fragment) =>
          `search_text.ilike.%${escapeLikePattern(fragment)}%,title.ilike.%${escapeLikePattern(fragment)}%,artist_name.ilike.%${escapeLikePattern(fragment)}%`,
      )
      .join(",");

    songQuery = songQuery.or(searchConditions);
  }

  const fetchLimit = searchQuery ? Math.min(Math.max(limit * 4, 48), 100) : Math.min(limit, 25);
  const { data, error } = await songQuery.limit(fetchLimit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data || []) as Array<{
    title: string;
    artist_name: string | null;
    category: string;
    rating: number | null;
    sort_order: number | null;
    created_at: string;
    id: string;
    search_text: string;
    search_terms: string | null;
  } & Record<string, unknown>>;

  if (matches.length === 0) {
    return buildJsonResponse([], undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  const filteredMatches = searchQuery
    ? matches.filter((song) => songMatchesSearchQuery(song, searchQuery))
    : matches;

  const rankedMatches = searchQuery
    ? filteredMatches.sort((left, right) => {
        const delta =
          scoreSongSearchQuery(right, searchQuery, category) -
          scoreSongSearchQuery(left, searchQuery, category);
        return delta === 0 ? 0 : delta;
      })
    : filteredMatches;

  // Keep the public response focused on the best matches after query normalization.
  return buildJsonResponse(rankedMatches.slice(0, limit), undefined, "public, s-maxage=120, stale-while-revalidate=300");
}

export async function POST(req: Request) {
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

  try {
    const body = (await req.json()) as SongPayload;
    const title = sanitizeText(body?.title);
    const artistName = sanitizeText(body?.artistName);
    const category = normalizeSongCategoryKey(sanitizeText(body?.category));
    const rating = body?.rating == null ? 5 : clampSongRating(Number(body.rating));
    const youtubeUrl = sanitizeText(body?.youtubeUrl);
    const thumbnailUrl = sanitizeText(body?.thumbnailUrl);
    const searchTerms = sanitizeText(body?.searchTerms);
    const published = Boolean(body?.published);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!title) {
      return NextResponse.json({ error: "Song title is required." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Select a valid category." }, { status: 400 });
    }
    if (!youtubeUrl) {
      return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
    }

    await ensureSongCategoryConstraints(supabaseAdmin);

    const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeUrl);
    const searchText = buildSongSearchText({
      title,
      artistName,
      category,
      searchTerms,
    });

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        title,
        artist_name: artistName || null,
        category,
        rating,
        youtube_url: youtubeUrl,
        youtube_embed_url: youtubeEmbedUrl,
        thumbnail_url: thumbnailUrl || null,
        search_terms: searchTerms || null,
        search_text: searchText,
        published,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: getSongSaveErrorMessage(error, "Failed to save song.") },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save song." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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

  try {
    const body = (await req.json()) as SongPayload;
    const id = sanitizeText(body?.id);
    const title = sanitizeText(body?.title);
    const artistName = sanitizeText(body?.artistName);
    const category = normalizeSongCategoryKey(sanitizeText(body?.category));
    const rating = body?.rating == null ? 5 : clampSongRating(Number(body.rating));
    const youtubeUrl = sanitizeText(body?.youtubeUrl);
    const thumbnailUrl = sanitizeText(body?.thumbnailUrl);
    const searchTerms = sanitizeText(body?.searchTerms);
    const published = Boolean(body?.published);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    await ensureSongCategoryConstraints(supabaseAdmin);

    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Song title is required." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Select a valid category." }, { status: 400 });
    }
    if (!youtubeUrl) {
      return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
    }

    const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeUrl);
    const searchText = buildSongSearchText({
      title,
      artistName,
      category,
      searchTerms,
    });

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        title,
        artist_name: artistName || null,
        category,
        rating,
        youtube_url: youtubeUrl,
        youtube_embed_url: youtubeEmbedUrl,
        thumbnail_url: thumbnailUrl || null,
        search_terms: searchTerms || null,
        search_text: searchText,
        published,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: getSongSaveErrorMessage(error, "Failed to update song.") },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update song." }, { status: 500 });
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
  const id = sanitizeText(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
