"use client";
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import Banner from "./Banner";

type PageShellProps = {
  children: React.ReactNode;
};

// Shared layout wrapper to keep header/footer and background consistent.
export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative isolate min-h-screen text-[var(--md-text)] px-4 sm:px-6 md:px-12 py-8 md:py-12 selection:bg-violet-500/30 flex flex-col items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[rgba(124,131,255,0.18)] blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[rgba(255,120,120,0.16)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[rgba(88,211,204,0.12)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 backdrop-blur-[6px]" />

      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col items-stretch">
        <Header />
        <div className="w-full min-w-0">{children}</div>
      </div>
      <span className="h-16 w-full"></span>
      <Banner />

      <div className="relative z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
