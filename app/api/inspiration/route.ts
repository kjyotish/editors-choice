import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

const TABLE = "inspiration_insights";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items: Insight[] =
    data?.map((row: any) => ({
      id: row.id,
      title: row.title,
      trend: row.trend,
      psychology: row.psychology,
      usage: row.usage,
      platforms: row.platforms,
      mediaUrl: row.media_url || undefined,
      mediaDataUrl: row.media_data_url || undefined,
      createdAt: row.created_at,
    })) || [];

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
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

    const next = {
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

    const insertData = insertRes.data;
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save insight" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
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
  return NextResponse.json({ ok: true }, { status: 200 });
}
