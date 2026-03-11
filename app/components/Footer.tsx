"use client";

import Link from "next/link";
import { Github, Instagram, Linkedin } from "lucide-react";

const socialLinks = [
  {
    name: "Instagram",
    handle: "@jk__editings",
    href: "https://www.instagram.com/jk__editings?igsh=MWxieXpodWMzcnRp",
    icon: Instagram,
  },
  {
    name: "GitHub",
    handle: "kjyotish",
    href: "https://github.com/kjyotish",
    icon: Github,
  },
  {
    name: "LinkedIn",
    handle: "Jyotish Kumar",
    href: "https://www.linkedin.com/in/jyotish-kumar-aa723823a?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    icon: Linkedin,
  },
];

// Global site footer.
export default function Footer() {
  return (
    <footer className="relative z-10 mt-12 w-full border-t border-[var(--md-outline)] bg-[var(--md-surface-3)]/70 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-6 md:grid-cols-[1.3fr_0.7fr_1fr] md:px-8 md:py-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--md-primary)]">
            Editors Choice
          </p>
          <h2 className="text-xl font-semibold tracking-[0.02em] text-[var(--md-text)]">
            Music discovery for editors who need usable picks fast.
          </h2>
          <p className="max-w-md text-sm leading-6 text-[var(--md-text-muted)]">
            Curated songs, inspiration, and workflow support for reels, cinematic edits, travel
            videos, and creator content.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
            Quick Links
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <Link
              href="/"
              className="text-[var(--md-text)] transition-colors hover:text-[var(--md-primary)]"
            >
              Home
            </Link>
            <Link
              href="/inspiration"
              className="text-[var(--md-text)] transition-colors hover:text-[var(--md-primary)]"
            >
              Inspiration
            </Link>
            <Link
              href="/contact"
              className="text-[var(--md-text)] transition-colors hover:text-[var(--md-primary)]"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-[var(--md-text)] transition-colors hover:text-[var(--md-primary)]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
            Connect
          </p>
          <div className="flex flex-col gap-3">
            {socialLinks.map(({ name, handle, href, icon: Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 transition-all hover:border-[var(--md-primary)] hover:bg-[rgba(124,131,255,0.08)]"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-[rgba(124,131,255,0.12)] p-2 text-[var(--md-primary)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--md-text)]">{name}</span>
                    <span className="block text-xs text-[var(--md-text-muted)]">{handle}</span>
                  </span>
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--md-text-muted)] transition-colors group-hover:text-[var(--md-primary)]">
                  Open
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--md-outline)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-4 text-xs text-[var(--md-text-muted)] sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 Editors Choice. All rights reserved.</p>
          <p>Built for video editors, reel creators, and content teams.</p>
        </div>
      </div>
    </footer>
  );
}
