"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";

// Global site header with desktop nav and mobile slide-in menu.
export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(() => {
    if (typeof window === "undefined") return "auto";
    const saved = window.localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "auto";
  });

  useEffect(() => {
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
      return;
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (mobileNavOpen) {
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
      return () => {
        body.style.overflow = "";
        html.style.overflow = "";
      };
    }

    body.style.overflow = "";
    html.style.overflow = "";
    return undefined;
  }, [mobileNavOpen]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  const resetAuto = () => {
    window.localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
    setTheme("auto");
  };

  return (
    <header className="relative z-[100] w-full">
      <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10 text-center w-full">
        <div className="text-sm font-semibold tracking-[0.3em] uppercase text-[var(--md-text)] hover:text-white transition-colors text-left sm:text-left">
          Editors Choice
        </div>
        <div className="hidden sm:flex flex-wrap items-center justify-center sm:justify-end gap-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)]">
          <Link
            className="hover:text-[var(--md-text)] transition-colors relative group"
            href="/"
          >
            Home
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </Link>

          <Link
            className="hover:text-[var(--md-text)] transition-colors relative group"
            href="/inspiration"
          >
            Inspiration
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </Link>
          <Link
            className="hover:text-[var(--md-text)] transition-colors relative group"
            href="/help"
          >
            Help
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </Link>
          <Link
            className="hover:text-[var(--md-text)] transition-colors relative group"
            href="/contact"
          >
            Contact
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </Link>
          <Link
            className="hover:text-[var(--md-text)] transition-colors relative group"
            href="/about"
          >
            About
            <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--md-primary)] transition-all group-hover:w-full" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] hover:text-[var(--md-text)] hover:bg-[var(--md-surface-2)] transition-all"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Moon className="w-3 h-3" />
              ) : (
                <Sun className="w-3 h-3" />
              )}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <button
              type="button"
              onClick={resetAuto}
              className="inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] hover:text-[var(--md-text)] hover:bg-[var(--md-surface-2)] transition-all"
              title="Use system theme"
            >
              Auto
            </button>
          </div>
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
          mobileNavOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[22rem] overflow-y-auto overscroll-contain bg-[var(--md-surface)] border-l border-[var(--md-outline)] shadow-2xl p-5 transition-transform ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
                Editors Choice
              </div>
              <div className="text-sm text-[var(--md-text)] font-semibold mt-1">
                Menu
              </div>
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
          <div className="flex flex-col gap-2 text-sm font-semibold text-[var(--md-text)]">
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/"
              onClick={() => setMobileNavOpen(false)}
            >
              Home
            </Link>
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/help"
              onClick={() => setMobileNavOpen(false)}
            >
              Help
            </Link>
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/inspiration"
              onClick={() => setMobileNavOpen(false)}
            >
              Inspiration
            </Link>
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/contact"
              onClick={() => setMobileNavOpen(false)}
            >
              Contact
            </Link>
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/about"
              onClick={() => setMobileNavOpen(false)}
            >
              About
            </Link>
            <Link
              className="flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 transition-colors hover:text-[var(--md-text)]"
              href="/terms"
              onClick={() => setMobileNavOpen(false)}
            >
              Terms
            </Link>
            <div className="mt-2 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--md-text-muted)] mb-2">
                Theme
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] hover:text-[var(--md-text)] hover:bg-[var(--md-surface)] transition-all"
                >
                  {theme === "dark" ? (
                    <Moon className="w-3 h-3" />
                  ) : (
                    <Sun className="w-3 h-3" />
                  )}
                  {theme === "dark" ? "Dark" : "Light"}
                </button>
                <button
                  type="button"
                  onClick={resetAuto}
                  className="inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] hover:text-[var(--md-text)] hover:bg-[var(--md-surface)] transition-all"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
