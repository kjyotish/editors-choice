export type Block =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

export type InspirationItem = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  blocks: Block[];
  keywords: string[] | null;
  published: boolean;
  view_count: number;
  sort_order: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type NoticeboardItem = {
  id: string;
  media_type: "image" | "svg" | "gif" | "video";
  media_url: string;
  alt_text: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at?: string | null;
};
