"use client";
import React, { Suspense, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, UserPlus } from "lucide-react";
import PageShell from "../components/PageShell";

export const dynamic = "force-dynamic";

type Mode = "signin" | "signup" | "forgot";



function LoginContent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirectTo")?.toString() || "/inspiration";
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const getRedirectUrl = () =>
    `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTarget)}`;

  const resetFeedback = () => {
    setStatus("idle");
    setMessage("");
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const handleCredentialAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase keys are missing. Check environment variables.");
      return;
    }

    const trimmedIdentifier = identifier.trim();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedIdentifier, {
          redirectTo: getRedirectUrl(),
        });
        if (error) throw error;
        setStatus("success");
        setMessage("Password reset link sent. Check your email inbox.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedIdentifier,
          password,
          options: { emailRedirectTo: getRedirectUrl() },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = redirectTarget;
          return;
        }
        setStatus("success");
        setMessage("Account created. Check your email to confirm signup before downloading.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedIdentifier,
        password,
      });
      if (error) throw error;
      window.location.href = redirectTarget;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Authentication failed. Try again.");
    } finally {
      setStatus((current) => (current === "success" ? current : "idle"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6">
      <header className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 backdrop-blur-xl">
          <Lock className="h-4 w-4 text-[var(--md-secondary)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
            Download Access
          </span>
        </div>
        <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Sign in before downloading media</h1>
        <p className="text-sm text-[var(--md-text-muted)] sm:text-base">
          Sign in with email and password. New users can sign up with email, and password reset is available from the same page.
        </p>
      </header>

      <section className="rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 shadow-xl backdrop-blur-2xl">
        <div className="mb-5 flex gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                : "text-[var(--md-text-muted)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                : "text-[var(--md-text-muted)]"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === "forgot"
                ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                : "text-[var(--md-text-muted)]"
            }`}
          >
            Forgot
          </button>
        </div>

        <form onSubmit={handleCredentialAuth} className="space-y-4">
          <label className="block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3">
            <Mail className="h-4 w-4 text-[var(--md-text-muted)]" />
            <input
              type="email"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="you@example.com"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          {mode !== "forgot" && (
            <>
              <label className="block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                className="w-full rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none"
              />
            </>
          )}

          <div className="rounded-[16px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-xs text-[var(--md-text-muted)]">
            {mode === "forgot"
              ? "Forgot password sends a reset link to your email address."
              : "Use the same email address for signup, login, and password reset."}
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-[var(--md-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-on-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            {status === "loading"
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : mode === "forgot"
                  ? "Send Reset Link"
                  : "Sign In"}
          </button>
        </form>
      </section>

      {mode === "signin" && (
        <button
          type="button"
          onClick={() => switchMode("forgot")}
          className="self-center text-sm text-[var(--md-primary)] transition-colors hover:opacity-80"
        >
          Forgot your password?
        </button>
      )}

      {message && (
        <div
          className={`rounded-[16px] border p-4 text-sm ${
            status === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-300"
              : "border-[var(--md-outline)] bg-[var(--md-surface-2)] text-[var(--md-text-muted)]"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center text-sm text-[var(--md-text-muted)]">
            Loading...
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </PageShell>
  );
}
