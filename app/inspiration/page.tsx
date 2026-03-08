"use client";
import { Sparkles } from "lucide-react";

export default function InspirationPage() {
  return (
    <div className="min-h-screen text-[var(--md-text)] px-4 md:px-12 py-12 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-1">
        <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div className="text-sm font-semibold tracking-[0.3em] uppercase text-[var(--md-text)]">
            EditorsChoice
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            <a className="hover:text-[var(--md-text)] transition-colors" href="/">
              Home
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="/inspiration">
              Editing Inspiration
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="/help">
              Help
            </a>
          </div>
        </nav>

        <section className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[28px] p-8 backdrop-blur-2xl shadow-xl">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-6 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
              Editing Inspiration
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">Coming Soon</h1>
          <p className="text-[var(--md-text-muted)] text-base max-w-2xl">
            This tool is coming soon. We’re building curated edit ideas, shot lists, and rhythm
            templates to help you create faster.
          </p>
        </section>
      </div>

      <footer className="mt-auto border-t border-[var(--md-outline)] pt-6 text-[var(--md-text-muted)] text-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="uppercase tracking-[0.35em] font-semibold text-center md:text-left">
            Built with Google Gemini AI and Next.js - 2026 Edition
          </div>
          <div className="flex flex-wrap items-center gap-4 uppercase tracking-[0.3em] font-semibold">
            <a className="hover:text-[var(--md-text)] transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-[var(--md-text)] transition-colors" href="#">
              Copyrighted Material
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
