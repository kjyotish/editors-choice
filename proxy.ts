import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  ADMIN_LOGIN_REDIRECT,
  isAdminSession,
  sanitizeRedirectPath,
} from "@/app/lib/authShared";

const isProtectedAdminPath = (pathname: string) =>
  pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

const isAdminLoginPath = (pathname: string) => pathname === "/admin/login";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  const pathname = req.nextUrl.pathname;
  if (!isProtectedAdminPath(pathname) || isAdminLoginPath(pathname)) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session || !isAdminSession(session)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set(
      "redirectTo",
      sanitizeRedirectPath(pathname, ADMIN_LOGIN_REDIRECT),
    );
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
