import type { Database } from "@/app/lib/supabaseAdmin";

export type DailyBlog = Database["public"]["Tables"]["daily_blogs"]["Row"];

export type BlogBlock =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

export type BlogContentDocument = {
  version: 1;
  blocks: BlogBlock[];
};

export const sanitizeBlogText = (value: unknown) => String(value || "").trim();

export const sanitizeBlogSlug = (value: unknown) =>
  sanitizeBlogText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const sanitizeBlogTags = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => sanitizeBlogText(item).toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 12);
};

const isTextBlock = (value: unknown): value is Extract<BlogBlock, { type: "title" | "subtitle" | "paragraph" }> => {
  if (!value || typeof value !== "object") return false;
  const block = value as { type?: unknown; text?: unknown };
  return (
    (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") &&
    typeof block.text === "string" &&
    block.text.trim().length > 0
  );
};

const isMediaBlock = (value: unknown): value is Extract<BlogBlock, { type: "video" | "music" | "image" | "svg" }> => {
  if (!value || typeof value !== "object") return false;
  const block = value as { type?: unknown; url?: unknown; caption?: unknown };
  return (
    (block.type === "video" || block.type === "music" || block.type === "image" || block.type === "svg") &&
    typeof block.url === "string" &&
    block.url.trim().length > 0 &&
    (block.caption === undefined || typeof block.caption === "string")
  );
};

const isListBlock = (value: unknown): value is Extract<BlogBlock, { type: "chips" | "keywords" }> => {
  if (!value || typeof value !== "object") return false;
  const block = value as { type?: unknown; items?: unknown };
  return (
    (block.type === "chips" || block.type === "keywords") &&
    Array.isArray(block.items) &&
    block.items.every((item) => typeof item === "string" && item.trim().length > 0)
  );
};

const isCustomBlock = (value: unknown): value is Extract<BlogBlock, { type: "custom" }> => {
  if (!value || typeof value !== "object") return false;
  const block = value as { type?: unknown; data?: unknown };
  return block.type === "custom" && !!block.data && typeof block.data === "object" && !Array.isArray(block.data);
};

const normalizeBlogBlock = (value: unknown): BlogBlock | null => {
  if (isTextBlock(value)) {
    return { type: value.type, text: value.text.trim() };
  }
  if (isMediaBlock(value)) {
    return {
      type: value.type,
      url: value.url.trim(),
      caption: typeof value.caption === "string" && value.caption.trim() ? value.caption.trim() : undefined,
    };
  }
  if (isListBlock(value)) {
    return {
      type: value.type,
      items: value.items.map((item) => item.trim()).filter(Boolean),
    };
  }
  if (isCustomBlock(value)) {
    return { type: "custom", data: value.data as Record<string, unknown> };
  }
  return null;
};

export const parseBlogContent = (content: string): BlogContentDocument => {
  const trimmed = sanitizeBlogText(content);
  if (!trimmed) {
    return { version: 1, blocks: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as { version?: unknown; blocks?: unknown };
    if (parsed?.version === 1 && Array.isArray(parsed.blocks)) {
      return {
        version: 1,
        blocks: parsed.blocks.map(normalizeBlogBlock).filter((block): block is BlogBlock => Boolean(block)),
      };
    }
  } catch {
    // Legacy plain-text blog content falls through below.
  }

  return {
    version: 1,
    blocks: contentToParagraphs(trimmed).map((text) => ({ type: "paragraph", text })),
  };
};

export const serializeBlogContent = (blocks: BlogBlock[]) =>
  JSON.stringify({ version: 1, blocks });

export const extractPlainTextFromBlocks = (blocks: BlogBlock[]) =>
  blocks
    .flatMap((block) => {
      if (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") {
        return [block.text];
      }
      if (block.type === "chips" || block.type === "keywords") {
        return block.items;
      }
      return [] as string[];
    })
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");

export const deriveExcerpt = (excerpt: string, content: string) => {
  if (excerpt.trim()) return excerpt.trim().slice(0, 220);
  const document = parseBlogContent(content);
  const plain = extractPlainTextFromBlocks(document.blocks).replace(/\s+/g, " ").trim();
  return plain.slice(0, 220);
};

export const contentToParagraphs = (content: string) =>
  content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

export const blogContentHasRenderableBlocks = (content: string) =>
  parseBlogContent(content).blocks.length > 0;
