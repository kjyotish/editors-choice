import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import { parseBlogContent, type BlogBlock, type DailyBlog } from "@/app/lib/blogs";
import { getSupabaseAdminOrThrow } from "@/app/lib/authServer";
import { getSiteUrl } from "@/app/lib/site";

export const revalidate = 300;

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|youtu\.be|youtube\.com|vimeo\.com|drive\.google\.com|res\.cloudinary\.com|cloudinary\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const getYouTubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const getVimeoEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
};

const getGoogleDriveEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (!parsed.hostname.includes("drive.google.com")) return null;
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    const id = parsed.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch {
    return null;
  }
};

const isCloudinaryVideoUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    return parsed.hostname.includes("res.cloudinary.com") && /\/video\/upload\//i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const isDirectVideoFile = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || isCloudinaryVideoUrl(url);

const getEmbedType = (url: string) => {
  const normalized = normalizeMediaUrl(url);
  const youtube = getYouTubeEmbedUrl(url);
  if (youtube) return { type: "frame" as const, src: youtube };
  const vimeo = getVimeoEmbedUrl(url);
  if (vimeo) return { type: "frame" as const, src: vimeo };
  const drive = getGoogleDriveEmbedUrl(url);
  if (drive) return { type: "frame" as const, src: drive };
  if (isDirectVideoFile(normalized)) return { type: "video" as const, src: normalized };
  return { type: "link" as const, src: normalized };
};

const isHeadingBlock = (block: BlogBlock) => block.type === "title" || block.type === "subtitle";
const isParagraphBlock = (block: BlogBlock) => block.type === "paragraph";
const isMediaBlock = (block: BlogBlock) =>
  block.type === "image" || block.type === "svg" || block.type === "video" || block.type === "music";

async function getBlogBySlug(slug: string) {
  const supabaseAdmin = getSupabaseAdminOrThrow();
  const { data, error } = await supabaseAdmin
    .from("daily_blogs")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as DailyBlog | null;
}

type Params = Promise<{ slug: string }>;

type BlogSection =
  | { type: "default"; blocks: BlogBlock[] }
  | { type: "feature"; headingBlocks: BlogBlock[]; mediaBlock: BlogBlock; paragraphBlocks: BlogBlock[] };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Blog not found",
    };
  }

  const siteUrl = getSiteUrl();
  const canonical = new URL(`/blogs/${blog.slug}`, siteUrl).toString();

  return {
    title: `${blog.title} | Editors Choice Blog`,
    description: blog.excerpt || blog.title,
    keywords: blog.tags || [],
    alternates: {
      canonical,
    },
    openGraph: {
      title: blog.title,
      description: blog.excerpt || blog.title,
      type: "article",
      url: canonical,
      publishedTime: blog.published_at || blog.created_at,
      images: blog.cover_image_url ? [{ url: blog.cover_image_url }] : undefined,
    },
    twitter: {
      card: blog.cover_image_url ? "summary_large_image" : "summary",
      title: blog.title,
      description: blog.excerpt || blog.title,
      images: blog.cover_image_url ? [blog.cover_image_url] : undefined,
    },
  };
}

function renderBlockContent(block: BlogBlock) {
  if (block.type === "title") {
    return <h2 className="text-2xl font-semibold text-[var(--md-text)]">{block.text}</h2>;
  }
  if (block.type === "subtitle") {
    return <h3 className="text-lg font-semibold text-[var(--md-text-muted)]">{block.text}</h3>;
  }
  if (block.type === "paragraph") {
    return <p className="text-[15px] leading-8 text-[var(--md-text)]">{block.text}</p>;
  }
  if (block.type === "chips" || block.type === "keywords") {
    return (
      <div className="flex flex-wrap gap-2">
        {block.items.map((item) => (
          <span key={item} className="rounded-full border border-[var(--md-outline)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
            {item}
          </span>
        ))}
      </div>
    );
  }
  if (block.type === "image" || block.type === "svg") {
    const src = normalizeMediaUrl(block.url);
    return (
      <figure className="overflow-hidden rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
        <div className="relative h-[20rem] w-full sm:h-[28rem]">
          <Image src={src} alt={block.caption || "Blog media"} fill unoptimized className="object-cover" sizes="100vw" />
        </div>
        {block.caption && <figcaption className="border-t border-[var(--md-outline)] px-4 py-3 text-sm text-[var(--md-text-muted)]">{block.caption}</figcaption>}
      </figure>
    );
  }
  if (block.type === "video") {
    const media = getEmbedType(block.url);
    return (
      <div className="space-y-3 overflow-hidden rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-3 sm:p-4">
        {media.type === "video" ? (
          <video controls playsInline preload="metadata" src={media.src} className="block max-h-[42rem] w-full rounded-[16px] bg-black object-contain" />
        ) : media.type === "frame" ? (
          <div className="relative w-full overflow-hidden rounded-[16px] pt-[56.25%]">
            <iframe src={media.src} title={block.caption || "Blog video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="absolute inset-0 h-full w-full" />
          </div>
        ) : (
          <a href={media.src} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--md-secondary)] underline underline-offset-4">Open video reference</a>
        )}
        {block.caption && <p className="text-sm text-[var(--md-text-muted)]">{block.caption}</p>}
      </div>
    );
  }
  if (block.type === "music") {
    return (
      <div className="space-y-3 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
        <audio controls preload="metadata" src={normalizeMediaUrl(block.url)} className="w-full" />
        {block.caption && <p className="text-sm text-[var(--md-text-muted)]">{block.caption}</p>}
      </div>
    );
  }
  if (block.type === "custom") {
    return (
      <pre className="overflow-auto rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 text-xs text-[var(--md-text-muted)]">
        {JSON.stringify(block.data, null, 2)}
      </pre>
    );
  }
  return null;
}

function renderBlock(block: BlogBlock, key: string) {
  const content = renderBlockContent(block);
  return content ? <div key={key}>{content}</div> : null;
}

function buildBlogSections(blocks: BlogBlock[]): BlogSection[] {
  const sections: BlogSection[] = [];
  let index = 0;

  while (index < blocks.length) {
    const headingBlocks: BlogBlock[] = [];
    while (index < blocks.length && isHeadingBlock(blocks[index])) {
      headingBlocks.push(blocks[index]);
      index += 1;
    }

    const mediaBlock = blocks[index];
    if (headingBlocks.length > 0 && mediaBlock && isMediaBlock(mediaBlock)) {
      const paragraphBlocks: BlogBlock[] = [];
      let paragraphIndex = index + 1;
      while (paragraphIndex < blocks.length && isParagraphBlock(blocks[paragraphIndex])) {
        paragraphBlocks.push(blocks[paragraphIndex]);
        paragraphIndex += 1;
      }

      if (paragraphBlocks.length > 0) {
        sections.push({
          type: "feature",
          headingBlocks,
          mediaBlock,
          paragraphBlocks,
        });
        index = paragraphIndex;
        continue;
      }

      sections.push({ type: "default", blocks: headingBlocks });
      index = headingBlocks.length === 0 ? index + 1 : index;
      continue;
    }

    if (headingBlocks.length > 0) {
      sections.push({ type: "default", blocks: headingBlocks });
      continue;
    }

    sections.push({ type: "default", blocks: [blocks[index]] });
    index += 1;
  }

  return sections;
}

function renderFeatureSection(section: Extract<BlogSection, { type: "feature" }>, baseKey: string) {
  const headingContent = section.headingBlocks.map((block, index) => (
    <div key={`${baseKey}-heading-${index}`}>{renderBlockContent(block)}</div>
  ));
  const paragraphContent = section.paragraphBlocks.map((block, index) => (
    <div key={`${baseKey}-paragraph-${index}`}>{renderBlockContent(block)}</div>
  ));
  const mediaContent = renderBlockContent(section.mediaBlock);

  return (
    <section key={baseKey} className="overflow-hidden rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] lg:items-start lg:gap-6">
      <div className="space-y-4">
        {headingContent}
        <div className="lg:hidden">{mediaContent}</div>
        <div className="space-y-4">{paragraphContent}</div>
      </div>
      <div className="hidden lg:block">{mediaContent}</div>
    </section>
  );
}

export default async function BlogDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const document = parseBlogContent(blog.content);
  const sections = buildBlogSections(document.blocks);

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-4xl rounded-[30px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-xl sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          Published {" "}
          {new Date(blog.published_at || blog.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--md-text)] sm:text-4xl">
          {blog.title}
        </h1>
        {blog.excerpt && (
          <p className="mt-4 text-base leading-7 text-[var(--md-text-muted)]">
            {blog.excerpt}
          </p>
        )}
        {Array.isArray(blog.tags) && blog.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {blog.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--md-outline)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}
        {blog.cover_image_url && (
          <div className="relative mt-8 h-[18rem] w-full overflow-hidden rounded-[24px] border border-[var(--md-outline)] sm:h-[24rem]">
            <Image src={blog.cover_image_url} alt={blog.title} fill unoptimized className="object-cover" sizes="100vw" />
          </div>
        )}
        <div className="mt-8 space-y-5">
          {sections.map((section, index) =>
            section.type === "feature"
              ? renderFeatureSection(section, `${blog.id}-section-${index}`)
              : (
                <div key={`${blog.id}-section-${index}`} className="space-y-5">
                  {section.blocks.map((block, blockIndex) => renderBlock(block, `${blog.id}-${index}-${blockIndex}`))}
                </div>
              ),
          )}
        </div>
      </article>
    </PageShell>
  );
}
