"use client";
import {
  Lightbulb,
  Film,
  Sparkles,
  Music,
  Wand2,
  Camera,
} from "lucide-react";
import PageShell from "../components/PageShell";

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
  return (
    <PageShell>
      <div className="max-w-6xl mx-auto w-full flex-1">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl">
            <Lightbulb className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
              Editing Inspiration
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3">
            Spark your next edit
          </h1>
          <p className="text-[var(--md-text-muted)] text-base max-w-2xl mx-auto">
            Quick ideas, pacing recipes, and music cues designed for reels,
            shorts, and cinematic social content.
          </p>
        </header>

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
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-opacity"
            >
              Start Finding Songs
            </a>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
