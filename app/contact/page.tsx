"use client";
import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to send message.");
      }

      form.reset();
      setStatus("success");
      setShowThanks(true);
    } catch (err) {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--md-text)] px-4 sm:px-6 md:px-12 py-10 md:py-12 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full backdrop-blur-xl">
            <MessageSquare className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
              Contact
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold">Get in Touch</h1>
          <p className="text-[var(--md-text-muted)] text-sm sm:text-base">
            Share feedback, report issues, or start a partnership conversation.
          </p>
        </header>

        <section className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[24px] p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-lg">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Feedback Form</h2>
            <p className="text-[var(--md-text-muted)] text-sm">
              We keep contact details private. Submit the form and we&apos;ll reply to the email you provide.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                name="name"
                placeholder="Your name"
                className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all text-sm"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Your email"
                className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all text-sm"
                required
              />
            </div>
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all text-sm w-full"
            />
            <textarea
              name="message"
              placeholder="Your message"
              rows={5}
              className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] px-4 py-3 rounded-[14px] outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all text-sm w-full resize-none"
              required
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg px-6 py-3 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {status === "sending" ? "Sending..." : "Send Feedback"}
            </button>
          </form>
          {status === "success" && (
            <p className="text-sm text-emerald-300">Thanks! Your message has been sent.</p>
          )}
          {status === "error" && <p className="text-sm text-red-300">{error}</p>}
        </section>
      </div>
      {showThanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-center shadow-2xl">
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-sm text-[var(--md-text-muted)] mb-6">
              Your message has been sent. We&apos;ll get back to you soon.
            </p>
            <button
              type="button"
              onClick={() => setShowThanks(false)}
              className="bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full font-semibold px-6 py-3 w-full transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
