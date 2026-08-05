import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { buildJsonResponse } from "@/app/lib/requestRuntime";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import {
  buildSongSearchText,
  clampSongRating,
  getYouTubeEmbedUrl,
  normalizeSongSearchText,
  normalizeSongCategoryKey,
} from "@/app/songs/songTypes";

const TABLE = "songs" as const;

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

const parseLimit = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(Math.max(Math.trunc(parsed), 1), 48);
};

const rankSongMatch = (song: {
  title: string;
  artist_name: string | null;
  category: string;
  rating: number | null;
  sort_order: number | null;
  created_at: string;
}, query: string, category: string) => {
  const normalizedQuery = normalizeSongSearchText(query);
  const title = normalizeSongSearchText(song.title);
  const artist = normalizeSongSearchText(song.artist_name || "");
  const songCategory = normalizeSongSearchText(song.category);
  const exactTitle = normalizedQuery && title === normalizedQuery ? 120 : 0;
  const titleMatch = normalizedQuery && title.includes(normalizedQuery) ? 90 : 0;
  const artistMatch = normalizedQuery && artist.includes(normalizedQuery) ? 45 : 0;
  const categoryMatch = category && songCategory === category ? 20 : 0;
  const ratingScore = clampSongRating(song.rating ?? 5) * 10;
  const sortScore = 10_000 - (song.sort_order ?? 10_000);
  const recencyScore = 1_000_000 - new Date(song.created_at).getTime();
  return exactTitle + titleMatch + artistMatch + categoryMatch + ratingScore + sortScore - recencyScore / 1_000_000;
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
  const category = normalizeSongCategoryKey(sanitizeText(searchParams.get("category")));
  const limit = parseLimit(searchParams.get("limit"));

  if (!query && !category) {
    return buildJsonResponse([], undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  let songQuery = supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("published", true)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (category) {
    songQuery = songQuery.eq("category", category);
  }

  if (query) {
    songQuery = songQuery.ilike("search_text", `%${query}%`);
  }

  const { data, error } = await songQuery.limit(Math.min(limit, 25));

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
  } & Record<string, unknown>>;

  if (matches.length === 0) {
    return buildJsonResponse([], undefined, "public, s-maxage=120, stale-while-revalidate=300");
  }

  // Results are already ordered by rating desc, then sort_order asc, then created_at desc
  // Ensure we return the full list of matched songs (filtered by query/category) to the client
  return buildJsonResponse(matches, undefined, "public, s-maxage=120, stale-while-revalidate=300");
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
        search_text: searchText,
        published,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save song." },
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
        { error: error?.message || "Failed to update song." },
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
