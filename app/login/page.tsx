"use client";
import React, { Suspense, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, UserPlus } from "lucide-react";
import PageShell from "../components/PageShell";
import {
  PUBLIC_LOGIN_REDIRECT,
  isValidEmail,
  normalizeEmail,
  sanitizeRedirectPath,
  toAuthMessage,
  validatePassword,
} from "@/app/lib/authShared";

export const dynamic = "force-dynamic";

type Mode = "signin" | "signup" | "forgot";

const modeCopy: Record<Mode, { title: string; intro: string; submit: string }> = {
  signin: {
    title: "Welcome back",
    intro: "Sign in to download media, keep your saved access, and continue where you left off.",
    submit: "Sign In",
  },
  signup: {
    title: "Create your account",
    intro: "Use your email and password to create a secure account. New accounts are confirmed automatically.",
    submit: "Create Account",
  },
  forgot: {
    title: "Reset your password",
    intro: "Enter your email address and we will send a password reset link.",
    submit: "Send Reset Link",
  },
};

function LoginContent() {
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
    PUBLIC_LOGIN_REDIRECT,
  );
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const resetFeedback = () => {
    setStatus("idle");
    setMessage("");
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    resetFeedback();
  };


  const getPasswordResetRedirectUrl = () =>
    `${window.location.origin}/reset-password?redirectTo=${encodeURIComponent(redirectTarget)}`;

  const handleCredentialAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;

    const email = normalizeEmail(identifier);
    if (!isValidEmail(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    if (mode !== "forgot" && !password) {
      setStatus("error");
      setMessage("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setStatus("error");
        setMessage(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setStatus("error");
        setMessage("Passwords do not match.");
        return;
      }
    }

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase keys are missing. Check environment variables.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getPasswordResetRedirectUrl(),
        });
        if (error) throw error;
        setStatus("success");
        setMessage("Password reset link sent. Please check your inbox.");
        return;
      }

      if (mode === "signup") {
        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const signupData = (await signupRes.json().catch(() => null)) as { error?: string } | null;
        if (!signupRes.ok) {
          throw new Error(signupData?.error || "Unable to create account.");
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      window.location.href = redirectTarget;
    } catch (error) {
      setStatus("error");
      setMessage(
        toAuthMessage(
          error,
          mode === "forgot"
            ? "Unable to send reset link."
            : mode === "signup"
              ? "Unable to create account."
              : "Unable to sign in.",
        ),
      );
    } finally {
      setStatus((current) => (current === "loading" ? "idle" : current));
    }
  };

  const copy = modeCopy[mode];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
      <section className="relative overflow-hidden rounded-[32px] border border-[var(--md-outline)] bg-[linear-gradient(145deg,rgba(8,20,34,0.95),rgba(14,38,60,0.9))] p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,200,250,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(48,209,88,0.16),transparent_28%)]" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
              <Lock className="h-4 w-4 text-cyan-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                Secure Access
              </span>
            </div>
            <h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
              Professional account access for downloads and member features.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
              Use one clean login flow for your download access. Admin access stays separate and protected.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Fast email and password login",
              "New signups are ready immediately with no email confirmation step",
              "Clear error messages for invalid email or wrong password",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-xl"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                <p className="text-sm text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 shadow-xl backdrop-blur-2xl sm:p-8">
        <div className="mb-6 flex gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-1">
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

        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-[var(--md-text)]">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--md-text-muted)]">{copy.intro}</p>
        </header>

        <form onSubmit={handleCredentialAuth} className="space-y-4">
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
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Password
              </label>
              <div className="flex items-center gap-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 focus-within:border-[var(--md-primary)]">
                <KeyRound className="h-4 w-4 text-[var(--md-text-muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"}
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
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
                Confirm Password
              </label>
              <div className="flex items-center gap-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 focus-within:border-[var(--md-primary)]">
                <Lock className="h-4 w-4 text-[var(--md-text-muted)]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="text-[var(--md-text-muted)] transition-colors hover:text-[var(--md-text)]"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-xs leading-5 text-[var(--md-text-muted)]">
            {mode === "signup"
              ? "Passwords must be at least 8 characters and include uppercase, lowercase, and a number."
              : mode === "forgot"
                ? "We will send a secure password reset link to your email address."
                : "Use the same email address you used when you created your account."}
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--md-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-on-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            {status === "loading" ? "Please wait..." : copy.submit}
            {status !== "loading" && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--md-text-muted)]">
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="transition-colors hover:text-[var(--md-text)]"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already signed up? Go to sign in"}
          </button>
          {mode !== "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-[var(--md-primary)] transition-opacity hover:opacity-80"
            >
              Forgot password?
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mt-5 rounded-[18px] border p-4 text-sm ${
              status === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {message}
          </div>
        )}
      </section>
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


