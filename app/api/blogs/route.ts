import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import {
  blogContentHasRenderableBlocks,
  deriveExcerpt,
  parseBlogContent,
  sanitizeBlogSlug,
  sanitizeBlogTags,
  sanitizeBlogText,
} from "@/app/lib/blogs";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { destroyCloudinaryAssets } from "@/app/lib/cloudinary";

const TABLE = "daily_blogs" as const;

type BlogPayload = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  tags?: string[];
  published?: boolean;
  sortOrder?: number;
};

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

const extractBlogMediaUrls = (content: string) =>
  parseBlogContent(content).blocks.flatMap((block) =>
    block.type === "video" || block.type === "music" || block.type === "image" || block.type === "svg"
      ? [block.url]
      : [],
  );

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const slug = sanitizeBlogSlug(searchParams.get("slug"));
  const limitParam = Number(searchParams.get("limit") || "");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 12) : null;

  if (all) {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }
  }

  let query = supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!all) {
    query = query.eq("published", true);
  }

  if (slug) {
    const { data, error } = await query.eq("slug", slug).maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
    }
    if (!data) {
      return NextResponse.json({ error: "Blog not found." }, { status: 404, headers: noStoreHeaders });
    }
    return NextResponse.json(data, {
      status: 200,
      headers: all ? noStoreHeaders : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  if (limit !== null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }

  return NextResponse.json(data || [], {
    status: 200,
    headers: all ? noStoreHeaders : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

async function saveBlog(req: Request, mode: "create" | "update") {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const body = (await req.json()) as BlogPayload;
  const id = sanitizeBlogText(body.id);
  const title = sanitizeBlogText(body.title);
  const rawSlug = sanitizeBlogText(body.slug);
  const slug = sanitizeBlogSlug(rawSlug || title);
  const content = sanitizeBlogText(body.content);
  const excerpt = deriveExcerpt(sanitizeBlogText(body.excerpt), content);
  const coverImageUrl = sanitizeBlogText(body.coverImageUrl);
  const tags = sanitizeBlogTags(body.tags);
  const published = Boolean(body.published);
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : null;

  if (mode === "update" && !id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400, headers: noStoreHeaders });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400, headers: noStoreHeaders });
  }
  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400, headers: noStoreHeaders });
  }
  if (!blogContentHasRenderableBlocks(content)) {
    return NextResponse.json({ error: "Content is required." }, { status: 400, headers: noStoreHeaders });
  }

  let existingSlugQuery = supabaseAdmin.from(TABLE).select("id").eq("slug", slug);
  if (mode === "update") {
    existingSlugQuery = existingSlugQuery.neq("id", id);
  }
  const existingSlugRes = await existingSlugQuery.maybeSingle();

  if (existingSlugRes.error) {
    return NextResponse.json({ error: existingSlugRes.error.message }, { status: 500, headers: noStoreHeaders });
  }
  if (existingSlugRes.data) {
    return NextResponse.json({ error: "Slug already exists. Choose a different title or slug." }, { status: 400, headers: noStoreHeaders });
  }

  let existingMediaUrls: string[] = [];
  if (mode === "update") {
    const { data: existingBlog, error: existingBlogError } = await supabaseAdmin
      .from(TABLE)
      .select("cover_image_url, content")
      .eq("id", id)
      .maybeSingle();

    if (existingBlogError) {
      return NextResponse.json({ error: existingBlogError.message }, { status: 500, headers: noStoreHeaders });
    }

    existingMediaUrls = [
      String(existingBlog?.cover_image_url || "").trim(),
      ...extractBlogMediaUrls(String(existingBlog?.content || "")),
    ].filter(Boolean);
  }

  const payload = {
    title,
    slug,
    excerpt: excerpt || null,
    content,
    cover_image_url: coverImageUrl || null,
    tags,
    published,
    sort_order: sortOrder,
    published_at: published ? new Date().toISOString() : null,
    updated_at: mode === "update" ? new Date().toISOString() : null,
  };

  const result = mode === "update"
    ? await supabaseAdmin.from(TABLE).update(payload).eq("id", id).select("*").single()
    : await supabaseAdmin.from(TABLE).insert(payload).select("*").single();

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error?.message || "Failed to save blog." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  if (mode === "update") {
    const nextMediaUrls = [coverImageUrl, ...extractBlogMediaUrls(content)].filter(Boolean);
    const removedMediaUrls = existingMediaUrls.filter((url) => !nextMediaUrls.includes(url));
    await destroyCloudinaryAssets(removedMediaUrls);
  }

  return NextResponse.json(result.data, {
    status: mode === "create" ? 201 : 200,
    headers: noStoreHeaders,
  });
}

export async function POST(req: Request) {
  return saveBlog(req, "create");
}

export async function PUT(req: Request) {
  return saveBlog(req, "update");
}

export async function DELETE(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const { searchParams } = new URL(req.url);
  const id = sanitizeBlogText(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400, headers: noStoreHeaders });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from(TABLE)
    .select("cover_image_url, content")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500, headers: noStoreHeaders });
  }

  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }

  const blockUrls = existing?.content ? extractBlogMediaUrls(String(existing.content)) : [];
  await destroyCloudinaryAssets([existing?.cover_image_url, ...blockUrls]);

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders });
}
