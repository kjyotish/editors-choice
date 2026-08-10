import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/lib/authServer";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SETTINGS_ID = "global";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("banner_visible")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }

  return NextResponse.json({ visible: data?.banner_visible ?? true }, { headers: noStoreHeaders });
}

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server is missing Supabase admin credentials." },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const body = (await req.json().catch(() => null)) as { visible?: unknown } | null;
  if (typeof body?.visible !== "boolean") {
    return NextResponse.json(
      { error: "Banner visibility must be true or false." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ id: SETTINGS_ID, banner_visible: body.visible }, { onConflict: "id" })
    .select("banner_visible")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }

  return NextResponse.json({ visible: data.banner_visible }, { headers: noStoreHeaders });
}
