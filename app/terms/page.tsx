"use client";
import React from "react";
import PageShell from "../components/PageShell";

const sections = [
  {
    title: "Use of the service",
    body: "Editors Choice provides song suggestions, music inspiration, and related editorial guidance for creators. You may use the service only for lawful purposes and in compliance with platform rules and applicable copyright laws.",
  },
  {
    title: "Music rights and licensing",
    body: "Editors Choice does not grant ownership, public performance rights, synchronization rights, or any music license. You are responsible for confirming whether a suggested song is permitted for your intended commercial, editorial, or social-media use.",
  },
  {
    title: "Accuracy of recommendations",
    body: "Suggestions may be generated or ranked using automated systems and may not always be complete, current, or suitable for your project. You should independently review tracks, credits, availability, and licensing terms before use.",
  },
  {
    title: "Intellectual property",
    body: "The site design, branding, text, and software components of Editors Choice remain the property of the site owner unless stated otherwise. Third-party song titles, artist names, and platform references belong to their respective owners.",
  },
  {
    title: "Prohibited conduct",
    body: "You may not misuse the site, interfere with its operation, attempt unauthorized access, scrape the service in a harmful way, or use the output to violate copyright, privacy, or platform policies.",
  },
  {
    title: "Limitation of liability",
    body: "Editors Choice is provided on an as-is basis without guarantees of uninterrupted access, ranking outcomes, or business results. To the maximum extent permitted by law, the site owner is not liable for losses arising from your use of the recommendations or service.",
  },
  {
    title: "Changes to these terms",
    body: "These terms may be updated as the service evolves. Continued use of the site after changes become effective means you accept the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--md-primary)]">
            Terms
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--md-text-muted)] sm:text-base">
            These terms govern access to Editors Choice and explain the responsibilities of users who
            rely on the site for song discovery and creative inspiration.
          </p>
        </header>

        <section className="space-y-4 rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          {sections.map((section) => (
            <article key={section.title} className="border-b border-[var(--md-outline)] pb-5 last:border-b-0 last:pb-0">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">{section.body}</p>
            </article>
          ))}
        </section>

        <p className="text-center text-[11px] text-[var(--md-text-muted)] sm:text-xs">
          Effective date: March 12, 2026
        </p>
      </div>
    </PageShell>
  );
}
