"use client";
import React, { useState } from "react";

// Global site header with desktop nav and mobile slide-in menu.
export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="relative z-[100] w-full">
      <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 text-center w-full">
        <div className="text-sm font-semibold tracking-[0.3em] uppercase text-[var(--md-text)] hover:text-white transition-colors text-left sm:text-left">
          Editors Choice
        </div>
        <div className="hidden sm:flex flex-wrap items-center justify-center sm:justify-end gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
          <a className="hover:text-[var(--md-text)] transition-colors relative group" href="/">
            Home
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </a>
          <a className="hover:text-[var(--md-text)] transition-colors relative group" href="/help">
            Help
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </a>
          <a className="hover:text-[var(--md-text)] transition-colors relative group" href="/contact">
            Contact
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </a>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="sm:hidden self-end bg-[var(--md-surface)] text-[var(--md-text)] hover:bg-[rgba(124,131,255,0.12)] p-3 rounded-[14px] border border-[var(--md-outline)] transition-all"
          aria-label="Open menu"
        >
          <span className="block w-5 h-0.5 bg-[var(--md-text)] mb-1.5" />
          <span className="block w-5 h-0.5 bg-[var(--md-text)] mb-1.5" />
          <span className="block w-5 h-0.5 bg-[var(--md-text)]" />
        </button>
      </nav>

      <div
        className={`fixed inset-0 z-[200] sm:hidden transition-opacity ${
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-72 max-w-[85%] bg-[var(--md-surface-2)] border-l border-[var(--md-outline)] shadow-2xl p-6 transition-transform ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
              Editors Choice
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="bg-transparent text-[var(--md-text)] hover:bg-[rgba(10, 132, 247, 0.12)] p-2 rounded-[10px] border border-transparent transition-all"
              aria-label="Close menu"
            >
              <span className="block w-4 h-0.5 bg-[var(--md-text)] rotate-45 translate-y-[1px]" />
              <span className="block w-4 h-0.5 bg-[var(--md-text)] -rotate-45 -translate-y-[1px]" />
            </button>
          </div>
          <div className="flex flex-col gap-4 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
            <a
              className="hover:text-[var(--md-text)] transition-colors"
              href="/"
              onClick={() => setMobileNavOpen(false)}
            >
              Home
            </a>
            <a
              className="hover:text-[var(--md-text)] transition-colors"
              href="/help"
              onClick={() => setMobileNavOpen(false)}
            >
              Help
            </a>
            <a
              className="hover:text-[var(--md-text)] transition-colors"
              href="/contact"
              onClick={() => setMobileNavOpen(false)}
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
