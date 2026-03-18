"use client";
import React, { Suspense, useMemo, useState } from "react";
import PageShell from "../../components/PageShell";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import {
  ADMIN_LOGIN_REDIRECT,
  isAdminSession,
  isValidEmail,
  normalizeEmail,
  sanitizeRedirectPath,
  toAuthMessage,
} from "@/app/lib/authShared";

export const dynamic = "force-dynamic";

function AdminLoginContent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);
  const searchParams = useSearchParams();
  const redirectTarget = sanitizeRedirectPath(
    searchParams.get("redirectTo")?.toString(),
    ADMIN_LOGIN_REDIRECT,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState(
    searchParams.get("error") === "access_denied"
      ? "This account does not have admin access."
      : "",
  );

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setStatus("error");
      setMessage("Please enter a valid admin email address.");
      return;
    }

    if (!password) {
      setStatus("error");
      setMessage("Please enter your password.");
      return;
    }

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase keys are missing. Check environment variables.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;
      if (!isAdminSession(session)) {
        await supabase.auth.signOut();
        setStatus("error");
        setMessage("This account does not have admin access.");
        return;
      }

      window.location.href = redirectTarget;
    } catch (error) {
      setStatus("error");
      setMessage(toAuthMessage(error, "Admin sign-in failed. Please try again."));
    } finally {
      setStatus((current) => (current === "loading" ? "idle" : current));
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[32px] border border-[var(--md-outline)] bg-[linear-gradient(155deg,rgba(22,28,45,0.96),rgba(11,63,94,0.92))] p-8 text-white shadow-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
          <ShieldCheck className="h-4 w-4 text-cyan-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Admin Only
          </span>
        </div>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          Separate admin login with role-protected access.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
          Only accounts marked as admin can enter the dashboard. Normal download users are blocked even if they are signed in.
        </p>
        <div className="mt-8 space-y-3">
          {[
            "Password-based admin sign in",
            "Role checked before page access and API access",
            "Automatic rejection for non-admin accounts",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-slate-200 backdrop-blur-xl"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 shadow-xl backdrop-blur-2xl sm:p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-[var(--md-text)]">Admin Sign In</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--md-text-muted)]">
            Use your admin email and password to continue to the dashboard.
          </p>
        </header>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 focus-within:border-[var(--md-primary)]">
              <Mail className="h-4 w-4 text-[var(--md-text-muted)]" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
              Password
            </label>
            <div className="flex items-center gap-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 focus-within:border-[var(--md-primary)]">
              <KeyRound className="h-4 w-4 text-[var(--md-text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-[var(--md-text-muted)] transition-colors hover:text-[var(--md-text)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-xs leading-5 text-[var(--md-text-muted)]">
            Admin pages and admin APIs both require an authenticated session with the admin role.
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--md-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-on-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            {status === "loading" ? "Signing in..." : "Access Dashboard"}
            {status !== "loading" && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {message}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center text-sm text-[var(--md-text-muted)]">
            Loading...
          </div>
        }
      >
        <AdminLoginContent />
      </Suspense>
    </PageShell>
  );
}
