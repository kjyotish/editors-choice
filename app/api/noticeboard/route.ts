import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { getSupabaseAdmin, type Database } from "@/app/lib/supabaseAdmin";
import { buildJsonResponse } from "@/app/lib/requestRuntime";

const TABLE = "noticeboard_content" as const;

type NoticeboardRow = Database["public"]["Tables"]["noticeboard_content"]["Row"];
type NoticeboardPayload = {
  id?: string;
  mediaType?: string;
  mediaUrl?: string;
  altText?: string;
  linkUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type NoticeboardMediaType = NoticeboardRow["media_type"];

const sanitizeText = (value: unknown) => String(value || "").trim();
const isNoticeboardMediaType = (value: string): value is NoticeboardMediaType =>
  value === "image" || value === "svg" || value === "gif" || value === "video";

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
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return buildJsonResponse(data || null, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return buildJsonResponse(data || null, undefined, "public, s-maxage=300, stale-while-revalidate=600");
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
    const body = (await req.json()) as NoticeboardPayload;
    const mediaType = sanitizeText(body?.mediaType).toLowerCase();
    const mediaUrl = sanitizeText(body?.mediaUrl);
    const altText = sanitizeText(body?.altText);
    const linkUrl = sanitizeText(body?.linkUrl);
    const isActive = Boolean(body?.isActive);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!isNoticeboardMediaType(mediaType)) {
      return NextResponse.json({ error: "Select a valid noticeboard media type." }, { status: 400 });
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Media URL is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        media_type: mediaType,
        media_url: mediaUrl,
        alt_text: altText || null,
        link_url: linkUrl || null,
        is_active: isActive,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Failed to save noticeboard content." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save noticeboard content." }, { status: 500 });
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
    const body = (await req.json()) as NoticeboardPayload;
    const id = sanitizeText(body?.id);
    const mediaType = sanitizeText(body?.mediaType).toLowerCase();
    const mediaUrl = sanitizeText(body?.mediaUrl);
    const altText = sanitizeText(body?.altText);
    const linkUrl = sanitizeText(body?.linkUrl);
    const isActive = Boolean(body?.isActive);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    if (!isNoticeboardMediaType(mediaType)) {
      return NextResponse.json({ error: "Select a valid noticeboard media type." }, { status: 400 });
    }

    if (!mediaUrl) {
      return NextResponse.json({ error: "Media URL is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        media_type: mediaType,
        media_url: mediaUrl,
        alt_text: altText || null,
        link_url: linkUrl || null,
        is_active: isActive,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Failed to update noticeboard content." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update noticeboard content." }, { status: 500 });
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
