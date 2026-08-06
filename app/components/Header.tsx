"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { ChevronDown, LogOut, ShieldCheck, Sun } from "lucide-react";
import { isAdminSession } from "@/app/lib/authShared";

// Global site header with desktop nav and mobile slide-in menu.
export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(() => {
    if (typeof window === "undefined") return "auto";
    const saved = window.localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "auto";
  });
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);
  const authIsReady = !supabase || authReady;

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

  useEffect(() => {
    if (!showMoreMenu) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-more-menu-root]")) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showMoreMenu]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session));
      setIsAdmin(isAdminSession(data.session));
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      setIsAdmin(isAdminSession(session));
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  const moreLinks = [
    { href: "/help", label: "Help" },
    { href: "/contact", label: "Contact" },
    { href: "/about", label: "About" },
  ];

  const resetAuto = () => {
    window.localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
    setTheme("auto");
  };

  const mobileMenuItemClass =
    "flex items-center justify-between rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--md-text)] transition-colors hover:text-[var(--md-text)]";
  const handleLogout = async () => {
    if (!supabase) {
      setAuthMessage("Authentication is not configured.");
      return;
    }

    await supabase.auth.signOut();
    setMobileNavOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="relative z-[100] w-full">
      <nav className="mb-8 px-3 py-3 sm:mb-10 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-full px-2 py-1 transition-transform hover:-translate-y-0.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(124,131,255,0.28),rgba(255,179,199,0.2))] text-sm font-semibold text-[var(--md-text)]">
              EC
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--md-text)]">
                Editors Choice
              </div>
            </div>
          </Link>

          <div className="hidden flex-wrap items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--md-text-muted)] sm:flex">
            <Link className="group relative rounded-full px-3 py-2 transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]" href="/">
              Home
              <span className="absolute bottom-1.5 left-3 h-[1px] w-[calc(100%-1.5rem)] scale-x-0 bg-[var(--md-primary)] transition-transform group-hover:scale-x-100" />
            </Link>
            <Link className="group relative rounded-full px-3 py-2 transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]" href="/inspiration">
              Inspiration
              <span className="absolute bottom-1.5 left-3 h-[1px] w-[calc(100%-1.5rem)] scale-x-0 bg-[var(--md-primary)] transition-transform group-hover:scale-x-100" />
            </Link>
            <Link className="group relative rounded-full px-3 py-2 transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]" href="/ai-prompts">
              AI Prompts
              <span className="absolute bottom-1.5 left-3 h-[1px] w-[calc(100%-1.5rem)] scale-x-0 bg-[var(--md-primary)] transition-transform group-hover:scale-x-100" />
            </Link>
            <Link className="group relative rounded-full px-3 py-2 transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]" href="/blogs">
              Blogs
              <span className="absolute bottom-1.5 left-3 h-[1px] w-[calc(100%-1.5rem)] scale-x-0 bg-[var(--md-primary)] transition-transform group-hover:scale-x-100" />
            </Link>
            <div className="relative" data-more-menu-root>
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="group inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
              >
                More
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMoreMenu ? "rotate-180" : ""}`} />
              </button>
              {showMoreMenu && (
                <div className="absolute left-1/2 top-full mt-3 w-40 -translate-x-1/2 rounded-[16px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-2 shadow-xl">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowMoreMenu(false)}
                      className="block rounded-[10px] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {authIsReady && isAdmin && (
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
                href="/dashboard"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            )}
            {authIsReady && isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            ) : (
              <Link
                className="inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
                href="/login"
              >
                Login
              </Link>
            )}
            <div className="flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)]/70 px-1.5 py-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]"
                title="Toggle theme"
              >
                {<Sun className="h-3 w-3" />}
                {"Theme"}
              </button>
              <button
                type="button"
                onClick={resetAuto}
                className="inline-flex items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]"
                title="Use system theme"
              >
                Auto
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex-none rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-3 text-[var(--md-text)] transition-all hover:bg-[rgba(124,131,255,0.12)] sm:hidden"
            aria-label="Open menu"
          >
            <span className="mb-1.5 block h-0.5 w-5 bg-[var(--md-text)]" />
            <span className="mb-1.5 block h-0.5 w-5 bg-[var(--md-text)]" />
            <span className="block h-0.5 w-5 bg-[var(--md-text)]" />
          </button>
        </div>
      </nav>

      {authMessage && (
        <div className="mb-4 rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {authMessage}
        </div>
      )}

      <div
        className={`fixed inset-0 z-[200] transition-opacity sm:hidden ${
          mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[22rem] overflow-y-auto overscroll-contain border-l border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-2xl transition-transform ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
                Editors Choice
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--md-text)]">Menu</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-[10px] border border-transparent bg-transparent p-2 text-[var(--md-text)] transition-all hover:bg-[rgba(10,132,247,0.12)]"
              aria-label="Close menu"
            >
              <span className="block h-0.5 w-4 translate-y-[1px] rotate-45 bg-[var(--md-text)]" />
              <span className="block h-0.5 w-4 -translate-y-[1px] -rotate-45 bg-[var(--md-text)]" />
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm font-semibold text-[var(--md-text)]">
            <Link className={mobileMenuItemClass} href="/" onClick={() => setMobileNavOpen(false)}>
              Home
            </Link>
            <Link className={mobileMenuItemClass} href="/inspiration" onClick={() => setMobileNavOpen(false)}>
              Inspiration
            </Link>
            <Link className={mobileMenuItemClass} href="/ai-prompts" onClick={() => setMobileNavOpen(false)}>
              AI Prompts
            </Link>
            <Link className={mobileMenuItemClass} href="/blogs" onClick={() => setMobileNavOpen(false)}>
              Blogs
            </Link>
            <div className="rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3">
              <button
                type="button"
                onClick={() => setMobileMoreOpen((prev) => !prev)}
                className="mb-2 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]"
              >
                <span>More</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileMoreOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileMoreOpen && (
                <div className="flex flex-col gap-2">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      className="rounded-[10px] px-3 py-2 text-sm font-semibold text-[var(--md-text)] transition-colors hover:bg-[var(--md-surface)] hover:text-[var(--md-primary)]"
                      href={link.href}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link className={mobileMenuItemClass} href="/terms" onClick={() => setMobileNavOpen(false)}>
              Terms
            </Link>
            {authIsReady && isAdmin && (
              <Link className={mobileMenuItemClass} href="/dashboard" onClick={() => setMobileNavOpen(false)}>
                Dashboard
              </Link>
            )}
            {authIsReady && isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className={`${mobileMenuItemClass} text-left`}
              >
                Logout
              </button>
            ) : (
              <Link className={mobileMenuItemClass} href="/login" onClick={() => setMobileNavOpen(false)}>
                Login
              </Link>
            )}
            <div className="mt-2 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--md-text-muted)]">Theme</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
                >
                  {<Sun className="h-3 w-3" />}
                  {"Theme"}
                </button>
                <button
                  type="button"
                  onClick={resetAuto}
                  className="inline-flex items-center rounded-full border border-[var(--md-outline)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-[var(--md-surface)] hover:text-[var(--md-text)]"
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
