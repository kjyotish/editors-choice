import type { Database } from "@/app/lib/supabaseAdmin";

export type DailyBlog = Database["public"]["Tables"]["daily_blogs"]["Row"];

export type BlogTextBlock = {
  type: "title" | "subtitle" | "paragraph";
  text: string;
  html?: string;
};

export type BlogBlock =
  | BlogTextBlock
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

export type BlogContentDocument = {
  version: 1;
  blocks: BlogBlock[];
};

export const sanitizeBlogText = (value: unknown) => String(value || "").trim();

const BLOG_ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
]);

const BLOG_ALLOWED_STYLE_PROPS = new Set([
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "margin-left",
  "padding-left",
  "text-align",
  "text-decoration",
  "text-decoration-line",
]);

const BLOG_BLOCK_TAG_PATTERN = /<(\/?)([a-z0-9-]+)([^>]*)>/gi;
const BLOG_ATTR_PATTERN = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(".*?"|'.*?'|[^\s"'=<>`]+))?/g;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const sanitizeStyleValue = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (
    /expression|javascript:|vbscript:|data:|@import|behavior:|url\s*\(/i.test(
      normalized,
    )
  ) {
    return "";
  }
  return /^[#(),.%\-/\s\w"']{1,200}$/i.test(normalized) ? normalized : "";
};

const sanitizeStyleAttribute = (value: string) => {
  const safeEntries = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex <= 0) return [];
      const property = entry.slice(0, separatorIndex).trim().toLowerCase();
      const propertyValue = sanitizeStyleValue(entry.slice(separatorIndex + 1));
      if (!BLOG_ALLOWED_STYLE_PROPS.has(property) || !propertyValue) return [];
      return [`${property}: ${propertyValue}`];
    });

  return safeEntries.join("; ");
};

const sanitizeAnchorHref = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return "";
  if (/^(https?:|mailto:|tel:)/i.test(normalized)) return normalized;
  return "";
};

const sanitizeTagAttributes = (tagName: string, rawAttributes: string) => {
  const safeAttributes: string[] = [];
  let match: RegExpExecArray | null;

  BLOG_ATTR_PATTERN.lastIndex = 0;
  while ((match = BLOG_ATTR_PATTERN.exec(rawAttributes)) !== null) {
    const attributeName = match[1].toLowerCase();
    const attributeValue = String(match[2] || "")
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (attributeName === "style") {
      const safeStyle = sanitizeStyleAttribute(attributeValue);
      if (safeStyle) safeAttributes.push(`style="${escapeHtml(safeStyle)}"`);
      continue;
    }

    if (tagName === "a" && attributeName === "href") {
      const safeHref = sanitizeAnchorHref(attributeValue);
      if (safeHref) safeAttributes.push(`href="${escapeHtml(safeHref)}"`);
      continue;
    }

    if (tagName === "a" && attributeName === "target") {
      if (attributeValue === "_blank") safeAttributes.push('target="_blank"');
      continue;
    }

    if (tagName === "a" && attributeName === "rel") {
      safeAttributes.push('rel="noopener noreferrer"');
    }
  }

  if (
    tagName === "a" &&
    safeAttributes.some((attribute) => attribute.startsWith('target="_blank"')) &&
    !safeAttributes.some((attribute) => attribute.startsWith("rel="))
  ) {
    safeAttributes.push('rel="noopener noreferrer"');
  }

  return safeAttributes.length > 0 ? ` ${safeAttributes.join(" ")}` : "";
};

export const sanitizeBlogHtml = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withoutUnsafeBlocks = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|meta|link)[^>]*\/?>/gi, "");

  return withoutUnsafeBlocks.replace(
    BLOG_BLOCK_TAG_PATTERN,
    (_match, closingSlash: string, rawTagName: string, rawAttributes: string) => {
      const tagName = rawTagName.toLowerCase();
      if (!BLOG_ALLOWED_TAGS.has(tagName)) return "";
      if (closingSlash) return `</${tagName}>`;
      if (tagName === "br") return "<br />";
      const attributes = sanitizeTagAttributes(tagName, rawAttributes || "");
      return `<${tagName}${attributes}>`;
    },
  );
};

export const extractPlainTextFromBlogMarkup = (value: string) =>
  decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|blockquote|pre)>/gi, "\n")
      .replace(/<(li)\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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
  const block = value as { type?: unknown; text?: unknown; html?: unknown };
  return (
    (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") &&
    typeof block.text === "string" &&
    (block.html === undefined || typeof block.html === "string")
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
    const html = typeof value.html === "string" ? sanitizeBlogHtml(value.html) : "";
    const text = html
      ? extractPlainTextFromBlogMarkup(html)
      : value.text.replace(/\r/g, "").trim();
    if (!text) return null;
    return {
      type: value.type,
      text,
      html: html || undefined,
    };
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
        return [block.html ? extractPlainTextFromBlogMarkup(block.html) : block.text];
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
