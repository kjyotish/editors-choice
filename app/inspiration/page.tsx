"use client";
import {
  Lightbulb,
  Film,
  Sparkles,
  Music,
  Wand2,
  Camera,
} from "lucide-react";
import Link from "next/link";
import PageShell from "../components/PageShell";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

type Block =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

type InspirationItem = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  blocks: Block[];
};

const inspirationSets = [
  {
    title: "Cinematic Travel",
    description:
      "Slow push-ins, wide establishing shots, and clean match cuts. Pair with ambient or orchestral builds.",
    tags: ["golden hour", "drone", "wide shots"],
    icon: Film,
  },
  {
    title: "Gym Reels",
    description:
      "Hard cuts on beat drops, close-ups on motion, and aggressive speed ramps.",
    tags: ["energetic", "bass hit", "speed ramp"],
    icon: Sparkles,
  },
  {
    title: "Bridal & Makeup",
    description:
      "Soft fades, glow highlights, and micro slow-mo for detail reveals.",
    tags: ["romantic", "soft light", "beauty"],
    icon: Wand2,
  },
  {
    title: "Food & Café",
    description:
      "Macro shots, quick whip pans, and subtle sound design for sizzle.",
    tags: ["warm tones", "macro", "texture"],
    icon: Camera,
  },
];

const editRecipes = [
  {
    title: "3-Beat Hook",
    description:
      "Open with the strongest shot, cut to a tight detail on beat 2, then reveal the full scene on beat 3.",
  },
  {
    title: "Momentum Stack",
    description:
      "Chain 5–7 fast cuts (0.3–0.6s) before the chorus, then slow to 1.2–1.6s for impact.",
  },
  {
    title: "Texture Sandwich",
    description:
      "Wide shot → texture/detail → wide shot. Keeps viewers grounded while showing craft.",
  },
];

const musicStarters = [
  "Search with the category + feeling + one depth tag.",
  "Use a viral hashtag for discovery, then switch to classic for evergreen picks.",
  "If a song feels close, try changing only the language to widen results.",
];

// Editing inspiration page to spark ideas and structure.
export default function InspirationPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = useMemo(() => {
    const totals = { posts: items.length, videos: 0, music: 0, images: 0, words: 0 };
    items.forEach((item) => {
      item.blocks?.forEach((block) => {
        if (block.type === "video") totals.videos += 1;
        if (block.type === "music") totals.music += 1;
        if (block.type === "image" || block.type === "svg") totals.images += 1;
        if (block.type === "paragraph") {
          totals.words += block.text.split(/\s+/).filter(Boolean).length;
        }
      });
    });
    return totals;
  }, [items]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/inspiration-content", {
          cache: "no-store",
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto w-full flex-1">
        <header className="mb-12">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl">
                <Lightbulb className="w-4 h-4 text-[var(--md-secondary)]" />
                <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
                  Editing Inspiration
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3">
                Inspiration Library
              </h1>
              <p className="text-[var(--md-text-muted)] text-base max-w-2xl">
                Professional‑grade ideas, tips, and creative references for video
                edits. Curated to keep your content fresh, clear, and on‑trend.
              </p>
            </div>
            <div className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[22px] p-5 sm:p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Posts</div>
                  <div className="text-2xl font-semibold">{stats.posts}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Words</div>
                  <div className="text-2xl font-semibold">{stats.words}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Videos</div>
                  <div className="text-2xl font-semibold">{stats.videos}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Media</div>
                  <div className="text-2xl font-semibold">
                    {stats.images + stats.music}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--md-text-muted)]">
                Content updates automatically as you publish new inspiration.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Latest Inspiration
            </h2>
            <span className="text-xs text-[var(--md-text-muted)]">
              {loading ? "Loading..." : `${items.length} posts`}
            </span>
          </div>
          {items.length === 0 && !loading ? (
            <div className="text-sm text-[var(--md-text-muted)] border border-[var(--md-outline)] rounded-[18px] p-6 bg-[var(--md-surface-2)]">
              No inspiration posts yet.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-5 shadow-sm space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm text-[var(--md-text-muted)]">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.summary && (
                    <p className="text-sm text-[var(--md-text-muted)] leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(
                        (item.blocks || []).map((block) => block.type),
                      ),
                    ).map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 rounded-full text-[11px] border border-[var(--md-outline)] text-[var(--md-text-muted)]"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {Array.isArray(item.blocks) &&
                      item.blocks.map((block, index) => {
                        if (block.type === "title") {
                          return (
                            <h4 key={index} className="text-base font-semibold">
                              {block.text}
                            </h4>
                          );
                        }
                        if (block.type === "subtitle") {
                          return (
                            <h5
                              key={index}
                              className="text-sm font-semibold text-[var(--md-text-muted)]"
                            >
                              {block.text}
                            </h5>
                          );
                        }
                        if (block.type === "paragraph") {
                          return (
                            <p
                              key={index}
                              className="text-sm text-[var(--md-text-muted)] leading-relaxed"
                            >
                              {block.text}
                            </p>
                          );
                        }
                        if (block.type === "chips" || block.type === "keywords") {
                          return (
                            <div key={index} className="flex flex-wrap gap-2">
                              {block.items.map((itemText) => (
                                <span
                                  key={itemText}
                                  className="px-3 py-1 rounded-full text-[11px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] text-[var(--md-text-muted)]"
                                >
                                  {itemText}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        if (block.type === "image" || block.type === "svg") {
                          return (
                            <div
                              key={index}
                              className="relative w-full h-44 rounded-[14px] overflow-hidden border border-[var(--md-outline)]"
                            >
                              <Image
                                src={block.url}
                                alt={block.caption || item.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                              />
                            </div>
                          );
                        }
                        if (block.type === "video") {
                          return (
                            <div key={index} className="space-y-2">
                              <video
                                controls
                                src={block.url}
                                className="w-full rounded-[14px] border border-[var(--md-outline)]"
                              />
                              {block.caption && (
                                <p className="text-xs text-[var(--md-text-muted)]">
                                  {block.caption}
                                </p>
                              )}
                            </div>
                          );
                        }
                        if (block.type === "music") {
                          return (
                            <div key={index} className="space-y-2">
                              <audio controls src={block.url} className="w-full" />
                              {block.caption && (
                                <p className="text-xs text-[var(--md-text-muted)]">
                                  {block.caption}
                                </p>
                              )}
                            </div>
                          );
                        }
                        if (block.type === "custom") {
                          return (
                            <pre
                              key={index}
                              className="text-xs text-[var(--md-text-muted)] bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[12px] p-3 overflow-auto"
                            >
                              {JSON.stringify(block.data, null, 2)}
                            </pre>
                          );
                        }
                        return null;
                      })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {inspirationSets.map((set) => {
            const Icon = set.icon;
            return (
              <div
                key={set.title}
                className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[24px] p-6 backdrop-blur-xl shadow-lg flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[14px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--md-primary)]" />
                  </div>
                  <h2 className="text-lg font-semibold">{set.title}</h2>
                </div>
                <p className="text-sm text-[var(--md-text-muted)] leading-relaxed">
                  {set.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {set.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.25em] bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[26px] p-6 backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                <Film className="w-5 h-5 text-[var(--md-primary)]" />
              </div>
              <h3 className="text-lg font-semibold">Edit Recipes</h3>
            </div>
            <div className="space-y-4">
              {editRecipes.map((recipe) => (
                <div
                  key={recipe.title}
                  className="border border-[var(--md-outline)] rounded-[20px] p-4 bg-[var(--md-surface-2)]"
                >
                  <h4 className="text-sm font-semibold mb-1">
                    {recipe.title}
                  </h4>
                  <p className="text-sm text-[var(--md-text-muted)]">
                    {recipe.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[26px] p-6 backdrop-blur-xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                <Music className="w-5 h-5 text-[var(--md-primary)]" />
              </div>
              <h3 className="text-lg font-semibold">Music Starters</h3>
            </div>
            <ul className="space-y-3 text-sm text-[var(--md-text-muted)]">
              {musicStarters.map((tip) => (
                <li key={tip} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--md-primary)]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-opacity"
            >
              Start Finding Songs
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
