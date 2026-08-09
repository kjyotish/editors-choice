"use client";

import React from "react";
import PageShell from "../components/PageShell";

const sections = [
  { title: "Acceptance of these terms", body: "By accessing or using Editors Choice, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the site." },
  { title: "The service", body: "Editors Choice provides creative references, AI prompt examples, curated song discovery, editorial articles, and related tools for educational and creative-use purposes. Song results may include third-party YouTube links and previews; we do not host or provide music downloads. We may add, change, pause, or remove features at any time." },
  { title: "Creative prompts and AI tools", body: "Prompt examples are starting points, not guaranteed outputs or professional advice. You are responsible for reviewing generated results, following the terms of the AI tool you use, and ensuring that your project is appropriate for its intended audience and platform." },
  { title: "Copyright, rights, and third-party material", body: "Editors Choice does not grant a licence to third-party images, videos, names, marks, music, or other material that may be referenced or linked on the site. A song result or YouTube preview is not a licence or permission to use that track. You must obtain any permissions, licences, releases, and approvals required for your use, including commercial or monetised use." },
  { title: "Accounts and administrator access", body: "Where account access is available, you must provide accurate information, protect your credentials, and promptly report unauthorised use. Dashboard and publishing tools are restricted to authorised administrators. Do not attempt to access, alter, or interfere with another person’s account or the site’s systems." },
  { title: "Acceptable use", body: "You may not use the site unlawfully; infringe intellectual-property or privacy rights; upload harmful, deceptive, or unlawful material; interfere with security or availability; scrape or automate access in a way that harms the service; or use the site to mislead others." },
  { title: "Advertising and sponsored content", body: "We may show clearly identifiable advertising or use affiliate links to support the site. Advertising does not constitute our endorsement of an advertiser’s product or service. Do not click ads artificially, encourage invalid clicks, or interfere with ad delivery. Any sponsored or affiliate relationship will be identified where required." },
  { title: "External links", body: "The site may link to third-party websites, AI tools, social platforms, or resources. Those sites are operated independently, and we are not responsible for their content, availability, privacy practices, or terms." },
  { title: "Disclaimer and limitation of liability", body: "Editors Choice is provided on an “as is” and “as available” basis. We do not guarantee uninterrupted access, error-free content, specific creative outcomes, legal clearance, licensing availability, or business results. To the maximum extent permitted by law, the site owner is not liable for losses arising from use of, or reliance on, the site or its content." },
  { title: "Changes and contact", body: "We may update these terms as the site evolves. Continued use after a revised version is posted means you accept the updated terms. Questions can be sent through the contact page or to kjyotish124@gmail.com." },
];

export default function TermsPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--md-primary)]">Terms</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--md-text-muted)] sm:text-base">These terms explain how to use Editors Choice responsibly, including its creative resources, account features, and advertising-supported areas.</p>
        </header>
        <section className="space-y-5 rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          {sections.map((section) => (
            <article key={section.title} className="border-b border-[var(--md-outline)] pb-5 last:border-b-0 last:pb-0">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">{section.body}</p>
            </article>
          ))}
        </section>
        <p className="text-center text-[11px] text-[var(--md-text-muted)] sm:text-xs">Effective date: August 9, 2026</p>
      </div>
    </PageShell>
  );
}
