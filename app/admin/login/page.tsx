"use client";
import React, { useState } from "react";
import PageShell from "../../components/PageShell";
import { Mail, ShieldCheck } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  );
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const target =
        searchParams.get("redirectTo")?.toString() || "/dashboard";
      const redirectTo = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
        target,
      )}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for the magic link to access the dashboard.");
    } catch {
      setStatus("error");
      setMessage("Failed to send magic link. Try again.");
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch {
      setStatus("error");
      setMessage("Email/password login failed. Check your credentials.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <PageShell>
      <div className="max-w-lg mx-auto w-full flex-1">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-4 backdrop-blur-xl">
            <ShieldCheck className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
              Admin Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
            Sign in to Dashboard
          </h1>
          <p className="text-[var(--md-text-muted)] text-sm sm:text-base">
            Enter your email to receive a magic link.
          </p>
        </header>

        <form
          onSubmit={handlePasswordLogin}
          className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[26px] p-6 backdrop-blur-2xl shadow-xl"
        >
          <label className="text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            Email
          </label>
          <div className="mt-2 flex items-center gap-3 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px]">
            <Mail className="w-4 h-4 text-[var(--md-text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="mt-2 w-full bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px] outline-none text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-5 w-full bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold px-6 py-3 text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-60"
          >
            {status === "sending" ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
          <span className="flex-1 h-px bg-[var(--md-outline)]" />
          Or
          <span className="flex-1 h-px bg-[var(--md-outline)]" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[26px] p-6 backdrop-blur-2xl shadow-xl"
        >
          <label className="text-xs uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            Email for Magic Link
          </label>
          <div className="mt-2 flex items-center gap-3 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-3 rounded-[16px]">
            <Mail className="w-4 h-4 text-[var(--md-text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-5 w-full bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold px-6 py-3 text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-60"
          >
            {status === "sending" ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 text-sm rounded-[16px] p-4 border ${
              status === "error"
                ? "text-red-300 border-red-500/20 bg-red-500/10"
                : "text-[var(--md-text-muted)] border-[var(--md-outline)] bg-[var(--md-surface-2)]"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </PageShell>
  );
}
