"use client";

import React from "react";
import { Cookie, FileText, Shield } from "lucide-react";
import PageShell from "../components/PageShell";

const sections = [
  {
    title: "Who we are",
    body: "Editors Choice is a creative resource for video editors and content creators. It is operated by Jyotish Kumar. This policy explains how information is handled when you browse the site, contact us, or use an account-enabled feature.",
  },
  {
    title: "Information we collect",
    body: "We may receive information you choose to provide, such as your name, email address, and message when you contact us. If you use account-enabled areas, our authentication provider processes the account information needed to sign in and secure access. Our hosting and security services may also process standard technical information such as device, browser, IP address, pages visited, and timestamps in server logs.",
  },
  {
    title: "How we use information",
    body: "We use this information to operate and protect the site, respond to messages, maintain authorised access, diagnose problems, and improve the usefulness and reliability of our content and features. We do not sell personal information from contact messages or use your prompt and song searches to create advertising profiles.",
  },
  {
    title: "Cookies, advertising, and similar technologies",
    body: "We use essential technologies needed for the site to work. We may also display advertisements from Google or other advertising partners to support Editors Choice. Those partners may use cookies, web beacons, identifiers, or IP-address-based signals to measure ads, limit repeat ads, prevent fraud, and—where permitted—personalise advertising. You can learn about Google’s advertising technologies and controls through Google’s Ads Settings. If advertising or analytics technology requires consent in your location, we will provide the required choice mechanism before enabling it.",
  },
  {
    title: "Service providers and sharing",
    body: "We use carefully selected providers to host the site, provide authentication, store uploaded media, deliver email, and, if enabled, serve advertising. They may process information only as needed to provide their services, comply with law, protect rights and safety, or respond to valid legal requests. We do not rent or sell your contact details.",
  },
  {
    title: "Data retention and security",
    body: "We keep information only for as long as reasonably necessary for the purpose described in this policy, including security, record-keeping, and legal obligations. We use reasonable technical and organisational safeguards, but no internet service can guarantee absolute security.",
  },
  {
    title: "Your choices and rights",
    body: "Depending on where you live, you may have rights to request access, correction, deletion, restriction, or information about your personal data. You may also be able to control advertising personalisation through your browser, device settings, or the relevant advertising provider. To make a privacy request, contact us using the address below.",
  },
  {
    title: "Children’s privacy",
    body: "Editors Choice is not directed to children under 13, and we do not knowingly collect personal information from children. If you believe a child has provided personal information, contact us so that we can review and take appropriate action.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this policy when our features, providers, or legal obligations change. The revised version will be posted here with an updated effective date.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 backdrop-blur-xl">
            <Shield className="h-4 w-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">Privacy Policy</span>
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Privacy Policy</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--md-text-muted)] sm:text-base">A clear explanation of how Editors Choice handles information, cookies, and advertising.</p>
        </header>

        <section className="space-y-6 rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <div className="flex items-start gap-3">
            <Cookie className="mt-1 h-5 w-5 shrink-0 text-[var(--md-primary)]" />
            <p className="text-sm leading-7 text-[var(--md-text-muted)]">This policy should be read together with our Terms of Service. It applies to the Editors Choice website and does not replace the privacy policies of third-party sites or tools you may visit from our links.</p>
          </div>
          {sections.map((section) => (
            <article key={section.title} className="border-t border-[var(--md-outline)] pt-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">{section.body}</p>
            </article>
          ))}
          <article className="border-t border-[var(--md-outline)] pt-6">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 shrink-0 text-[var(--md-primary)]" />
              <div>
                <h2 className="text-lg font-semibold">Contact</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">For privacy questions or requests, use the contact page or email <a href="mailto:kjyotish124@gmail.com" className="text-[var(--md-primary)] underline underline-offset-4">kjyotish124@gmail.com</a>.</p>
              </div>
            </div>
          </article>
        </section>
        <p className="text-center text-[11px] text-[var(--md-text-muted)] sm:text-xs">Effective date: August 9, 2026</p>
      </div>
    </PageShell>
  );
}
