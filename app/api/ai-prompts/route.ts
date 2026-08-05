import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { getSupabaseAdmin, type Database } from "@/app/lib/supabaseAdmin";
import { buildJsonResponse } from "@/app/lib/requestRuntime";
import { destroyCloudinaryAssets } from "@/app/lib/cloudinary";

const TABLE = "ai_prompts" as const;

type AiPromptRow = Database["public"]["Tables"]["ai_prompts"]["Row"];
type AiPromptType = AiPromptRow["prompt_type"];

type AiPromptPayload = {
  id?: string;
  title?: string;
  promptType?: string;
  promptText?: string;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  videoUrl?: string | null;
  published?: boolean;
  sortOrder?: number | null;
};

const sanitizeText = (value: unknown) => String(value || "").trim();

const isAiPromptType = (value: string): value is AiPromptType =>
  value === "image_generation" ||
  value === "color_grade_image" ||
  value === "image_to_video";

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
      .eq("published", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return buildJsonResponse(data || null, undefined, "public, s-maxage=300, stale-while-revalidate=600");
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return buildJsonResponse(data || [], undefined, "public, s-maxage=300, stale-while-revalidate=600");
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
    const body = (await req.json()) as AiPromptPayload;
    const title = sanitizeText(body?.title);
    const promptType = sanitizeText(body?.promptType).toLowerCase();
    const promptText = sanitizeText(body?.promptText);
    const beforeImageUrl = sanitizeText(body?.beforeImageUrl);
    const afterImageUrl = sanitizeText(body?.afterImageUrl);
    const videoUrl = sanitizeText(body?.videoUrl);
    const published = Boolean(body?.published);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!isAiPromptType(promptType)) {
      return NextResponse.json({ error: "Select a valid prompt type." }, { status: 400 });
    }
    if (!promptText) {
      return NextResponse.json({ error: "Prompt text is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        title,
        prompt_type: promptType,
        prompt_text: promptText,
        before_image_url: beforeImageUrl || null,
        after_image_url: afterImageUrl || null,
        video_url: videoUrl || null,
        published,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save AI prompt." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save AI prompt." }, { status: 500 });
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
    const body = (await req.json()) as AiPromptPayload;
    const id = sanitizeText(body?.id);
    const title = sanitizeText(body?.title);
    const promptType = sanitizeText(body?.promptType).toLowerCase();
    const promptText = sanitizeText(body?.promptText);
    const beforeImageUrl = sanitizeText(body?.beforeImageUrl);
    const afterImageUrl = sanitizeText(body?.afterImageUrl);
    const videoUrl = sanitizeText(body?.videoUrl);
    const published = Boolean(body?.published);
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : null;

    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!isAiPromptType(promptType)) {
      return NextResponse.json({ error: "Select a valid prompt type." }, { status: 400 });
    }
    if (!promptText) {
      return NextResponse.json({ error: "Prompt text is required." }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(TABLE)
      .select("before_image_url, after_image_url, video_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        title,
        prompt_type: promptType,
        prompt_text: promptText,
        before_image_url: beforeImageUrl || null,
        after_image_url: afterImageUrl || null,
        video_url: videoUrl || null,
        published,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to update AI prompt." },
        { status: 500 },
      );
    }

    const urlsToDelete: Array<string | null | undefined> = [];
    if (existing?.before_image_url && beforeImageUrl !== existing.before_image_url) {
      urlsToDelete.push(existing.before_image_url);
    }
    if (existing?.after_image_url && afterImageUrl !== existing.after_image_url) {
      urlsToDelete.push(existing.after_image_url);
    }
    if (existing?.video_url && videoUrl !== existing.video_url) {
      urlsToDelete.push(existing.video_url);
    }

    await destroyCloudinaryAssets(urlsToDelete);

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update AI prompt." }, { status: 500 });
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

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from(TABLE)
    .select("before_image_url, after_image_url, video_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await destroyCloudinaryAssets([existing?.before_image_url, existing?.after_image_url, existing?.video_url]);
  return NextResponse.json({ ok: true }, { status: 200 });
}
