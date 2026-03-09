"use client";
import React from "react";

// Global site footer.
export default function Footer() {
  return (
    <footer className="relative z-10 mt-12 md:mt-16 border-t border-[var(--md-outline)] pt-6 text-[var(--md-text-muted)] text-xs w-full">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center">
        <div className="uppercase tracking-[0.35em] font-semibold hover:text-[var(--md-text)] transition-colors">
          Colour Grading AI Idea Coming Soon
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 uppercase tracking-[0.3em] font-semibold">
          <a className="hover:text-[var(--md-text)] transition-colors relative group" href="/privacy">
            Privacy & Policy
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </a>
          <a className="hover:text-[var(--md-text)] transition-colors relative group" href="#">
            Copyrighted @2026
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </a>
        </div>
      </div>
    </footer>
  );
}
