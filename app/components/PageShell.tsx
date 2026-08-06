"use client";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Banner from "./Banner";

type PageShellProps = {
  children: React.ReactNode;
};

// Shared layout wrapper to keep header/footer and background consistent.
export default function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();
  const [bannerVisible, setBannerVisible] = useState(true);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isDashboardRoute = (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) ?? false;

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem("banner-visible");
      if (storedValue !== null) {
        setBannerVisible(storedValue === "true");
      }
    } catch {
      // Ignore storage access issues in non-browser contexts.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("banner-visible", String(bannerVisible));
    } catch {
      // Ignore storage access issues in non-browser contexts.
    }
  }, [bannerVisible]);

  return (
    <div className="relative isolate min-h-screen text-[var(--md-text)] px-3 sm:px-6 md:px-12 py-6 sm:py-8 md:py-12 selection:bg-violet-500/30 flex flex-col items-center overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[rgba(124,131,255,0.18)] blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[rgba(255,120,120,0.16)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[rgba(88,211,204,0.12)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 hidden sm:block backdrop-blur-[6px]" />

      {isDashboardRoute && (
        <button
          type="button"
          onClick={() => setBannerVisible((prev) => !prev)}
          className="fixed right-3 top-3 z-[60] flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_10px_30px_rgba(0,0,0,0.34)]"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${bannerVisible ? "bg-emerald-400" : "bg-amber-400"}`} />
          {bannerVisible ? "Hide Banner" : "Show Banner"}
        </button>
      )}

      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col items-stretch">
        <Header />
        <div className="w-full min-w-0">{children}</div>
      </div>
      <span className="h-10 sm:h-16 w-full"></span>
      <Banner visible={bannerVisible} />

      <div className="relative z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
