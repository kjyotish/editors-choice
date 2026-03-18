import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { isAdminSession } from "@/app/lib/authShared";

export async function createServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
}

export async function getServerSession() {
  const supabase = await createServerAuthClient();
  const sessionRes = await supabase.auth.getSession();
  return sessionRes.data.session;
}

export async function requireAdminSession() {
  const session = await getServerSession();
  if (!session || !isAdminSession(session)) {
    return null;
  }
  return session;
}

export function getSupabaseAdminOrThrow() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error("Server is missing Supabase admin credentials.");
  }
  return supabaseAdmin;
}
