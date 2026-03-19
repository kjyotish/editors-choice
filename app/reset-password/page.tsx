"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import PageShell from "../components/PageShell";
import {
  PUBLIC_LOGIN_REDIRECT,
  sanitizeRedirectPath,
  toAuthMessage,
  validatePassword,
} from "@/app/lib/authShared";

export const dynamic = "force-dynamic";

function ResetPasswordContent() {
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    if (!supabase || typeof window === "undefined") {
      setCheckingLink(false);
      setRecoveryReady(false);
      setMessage("Supabase keys are missing. Check environment variables.");
      setStatus("error");
      return;
    }

    let active = true;

    const establishRecoverySession = async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const type = hash.get("type");

        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}${window.location.search}`,
          );
          if (!active) return;
          setRecoveryReady(true);
          setStatus("idle");
          setMessage("");
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;

        if (data.session) {
          setRecoveryReady(true);
          setStatus("idle");
          setMessage("");
          return;
        }

        setRecoveryReady(false);
        setStatus("error");
        setMessage("This reset link is invalid or has expired. Please request a new one.");
      } catch (error) {
        if (!active) return;
        setRecoveryReady(false);
        setStatus("error");
        setMessage(toAuthMessage(error, "Unable to verify reset link."));
      } finally {
        if (active) {
          setCheckingLink(false);
        }
      }
    };

    void establishRecoverySession();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;

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

    if (!supabase || !recoveryReady) {
      setStatus("error");
      setMessage("Open a valid password reset link and try again.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatus("success");
      setMessage("Password updated successfully. Redirecting...");
      window.setTimeout(() => {
        window.location.href = redirectTarget;
      }, 1200);
    } catch (error) {
      setStatus("error");
      setMessage(toAuthMessage(error, "Unable to update password."));
    } finally {
      setStatus((current) => (current === "loading" ? "idle" : current));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6">
      <section className="rounded-[32px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 shadow-xl backdrop-blur-2xl sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--md-text)] sm:text-3xl">
            Set a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--md-text-muted)]">
            Open the reset link from your email, then create a new password here.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
              New Password
            </label>
            <div className="flex items-center gap-3 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 focus-within:border-[var(--md-primary)]">
              <KeyRound className="h-4 w-4 text-[var(--md-text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
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

          <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-xs leading-5 text-[var(--md-text-muted)]">
            Passwords must be at least 8 characters and include uppercase, lowercase, and a number.
          </div>

          <button
            type="submit"
            disabled={checkingLink || !recoveryReady || status === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--md-primary)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-on-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            {checkingLink ? "Checking link..." : status === "loading" ? "Please wait..." : "Update Password"}
            {!checkingLink && status !== "loading" && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

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

export default function ResetPasswordPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center text-sm text-[var(--md-text-muted)]">
            Loading...
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </PageShell>
  );
}
