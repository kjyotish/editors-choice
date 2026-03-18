import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  ADMIN_LOGIN_REDIRECT,
  isAdminSession,
  sanitizeRedirectPath,
} from "@/app/lib/authShared";

const isAdminArea = (pathname: string) =>
  pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRedirect = sanitizeRedirectPath(
    requestUrl.searchParams.get("redirectTo"),
    ADMIN_LOGIN_REDIRECT,
  );
  let redirectTo = requestedRedirect;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    await supabase.auth.exchangeCodeForSession(code);
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes.data.session;

    if (isAdminArea(requestedRedirect) && !isAdminSession(session)) {
      redirectTo = "/admin/login?error=access_denied";
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
