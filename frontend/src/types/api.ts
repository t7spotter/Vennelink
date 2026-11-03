/**
 * Typed models for the Django JSON web API (/webapi/*) responses.
 * Derived from the backend serializers in links/webapi.py,
 * accounts/webapi.py, and analytics/webapi.py.
 */

export type LinkStatus = "active" | "inactive" | "expired" | "scheduled";

/** The row subset rendered in the dashboard table. */
export interface LinkRow {
  id: number;
  code: string;
  short_url: string;
  destination: string;
  title: string;
  status: LinkStatus;
  is_active: boolean;
  goes_live_at: string | null;
  health_status: "" | "ok" | "error";
  health_detail: string;
  tags: string[];
  click_count: number;
  last_click_at: string | null;
  created_at: string;
}

/** Full link payload — the edit page and analytics header use this. */
export interface LinkDetail extends LinkRow {
  notes: string;
  permanent: boolean;
  public_stats: boolean;
  public_hide_countries: boolean;
  expires_at: string | null;
  expires_local: string;
  goes_live_local: string;
  variant_b: string;
  domain: string;
  qr_dark: string;
  qr_light: string;
  allowed_referrers: string[];
  has_password: boolean;
  domain_choices: string[];
  updated_at: string;
}

export type FieldErrors = Record<string, string[]>;

export interface TablePayload {
  items: LinkRow[];
  page: number;
  num_pages: number;
  count: number;
  tag_names: string[];
  /** 14-day click counts per link id (string keys, JSON object). */
  spark: Record<string, number[]>;
  query: string;
  status: string;
  tag: string;
}

export interface SeriesPoint {
  date: string;
  clicks: number;
}

export interface DashboardPayload extends TablePayload {
  stats: {
    total_links: number;
    active_links: number;
    total_clicks: number;
    last_click: string | null;
  };
  series: SeriesPoint[];
  series_total: number;
  recent_clicks: Array<{
    code: string;
    created_at: string;
    timesince: string;
  }>;
}

export interface SitePayload {
  site_url: string;
  landing_enabled: boolean;
  registration_enabled: boolean;
  google_oauth: boolean;
  extra_domains: string[];
  max_import_rows: number;
  features: Array<{ icon: string; title: string; text: string }>;
  preview_items: Array<{ icon: string; title: string; code: string }>;
}

export interface ProfilePayload {
  username: string;
  email: string;
  date_joined: string;
  link_count: number;
  two_factor_enabled: boolean;
  has_api_token: boolean;
  weekly_digest: boolean;
  webhook_url: string;
  other_sessions: Array<{ expires: string }>;
}

export interface AnalyticsPayload {
  link: {
    code: string;
    short_url: string;
    destination: string;
    title: string;
    status: LinkStatus;
    is_active: boolean;
    created_at: string;
    public_stats: boolean;
    stats_path: string;
    variant_b: string;
  };
  bots: boolean;
  variant_a_count: number;
  variant_b_count: number;
  total_clicks: number;
  bot_clicks: number;
  total_clicks_30: number;
  series: SeriesPoint[];
  referrers: Array<{ referrer: string; count: number }>;
  devices: Record<string, number>;
  countries: Array<{ country: string; count: number }>;
  recent_clicks: Array<{
    referrer: string;
    device: string;
    created_at: string;
  }>;
}

export interface PublicStatsPayload {
  code: string;
  title: string;
  total_clicks: number;
  total_clicks_30: number;
  tracking_since: string;
  series: SeriesPoint[];
  show_countries: boolean;
  countries: Array<{ country: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  devices: Record<string, number>;
}

export interface ImportPayload {
  created: number;
  total: number;
  failed: Array<{ row: number; message: string }>;
  hidden_errors: number;
}

export interface McpTool {
  name: string;
  description: string;
  args: string;
}
