import { createClient } from "@supabase/supabase-js";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Database = {
  public: {
    Tables: {
      inspiration_insights: {
        Row: {
          id: string;
          title: string;
          trend: string;
          psychology: string;
          usage: string;
          platforms: string;
          media_url: string | null;
          media_data_url: string | null;
          created_at: string;
        };
        Insert: {
          title: string;
          trend: string;
          psychology: string;
          usage: string;
          platforms: string;
          media_url?: string | null;
          media_data_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inspiration_insights"]["Insert"]>;
        Relationships: [];
      };
      inspiration_content: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          summary: string | null;
          blocks: Json;
          keywords: string[] | null;
          published: boolean;
          view_count: number;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string[] | null;
          content_hash: string | null;
          seo_updated_at: string | null;
          sort_order: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          title: string;
          subtitle?: string | null;
          summary?: string | null;
          blocks?: Json;
          keywords?: string[] | null;
          published?: boolean;
          view_count?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string[] | null;
          content_hash?: string | null;
          seo_updated_at?: string | null;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inspiration_content"]["Insert"]>;
        Relationships: [];
      };
      noticeboard_content: {
        Row: {
          id: string;
          media_type: "image" | "svg" | "gif" | "video";
          media_url: string;
          alt_text: string | null;
          link_url: string | null;
          is_active: boolean;
          sort_order: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          media_type: "image" | "svg" | "gif" | "video";
          media_url: string;
          alt_text?: string | null;
          link_url?: string | null;
          is_active?: boolean;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["noticeboard_content"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let cachedAdminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  cachedAdminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedAdminClient;
}
