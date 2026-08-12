import { supabase } from '../supabase';

/**
 * Launch analytics.
 *
 * Every call is fire-and-forget: analytics must never block a render, never
 * throw into the UI, and never stop someone from signing up because a write
 * failed. Failures are swallowed on purpose.
 */

export type AnalyticsEvent =
  | 'landing_view'
  | 'landing_cta_click'
  | 'signin_completed'
  | 'signup_started'
  | 'signup_completed'
  | 'paywall_view'
  | 'checkout_started'
  | 'trial_started'
  | 'subscription_active'
  | 'goal_created'
  | 'boss_added'
  | 'task_added'
  | 'task_completed'
  | 'boss_defeated'
  | 'goal_completed'
  // Frontier. The board events above are kept so the historical rows already
  // in analytics_events still typecheck against this union.
  | 'plot_created'
  | 'fork_taken'
  | 'collision_opened';

const SESSION_KEY = 'monsterGoalsSession';
const ATTRIBUTION_KEY = 'monsterGoalsAttribution';

interface Attribution {
  referrer: string;
  utmSource: string;
}

function readSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'anonymous';
  }
}

/**
 * Captured once per session and reused. By the time someone pays, the
 * referrer is long gone from `document.referrer`, so attribution has to be
 * pinned at first contact — that is the whole point of running a campaign.
 */
function readAttribution(): Attribution {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {
      referrer: document.referrer || '',
      utmSource: params.get('utm_source') || params.get('ref') || '',
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return { referrer: '', utmSource: '' };
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  try {
    const { referrer, utmSource } = readAttribution();
    void supabase
      .from('analytics_events')
      .insert({
        event,
        session_id: readSessionId(),
        referrer: referrer || null,
        utm_source: utmSource || null,
        path: window.location.pathname,
        props: props ?? null,
      })
      .then(undefined, () => undefined);
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Fires an event at most once per browser session. Used for the funnel stages
 * that would otherwise re-fire on every render or reload and inflate the
 * numbers you are trying to read.
 */
const fired = new Set<string>();

export function trackOnce(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  const key = `${SESSION_KEY}:${event}`;
  try {
    // sessionStorage is the source of truth so the guard survives a remount
    // and resets with the session.
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage unavailable (private mode, blocked cookies) — fall back to the
    // in-memory guard so the event still fires at most once per page load.
    if (fired.has(event)) return;
  }
  fired.add(event);
  track(event, props);
}

export interface FunnelStage {
  ord: number;
  event: string;
  sessions: number;
}

export interface DailyPoint {
  day: string;
  visitors: number;
  signups: number;
}

export interface ReferrerRow {
  source: string;
  sessions: number;
}

export interface AnalyticsSummary {
  days: number;
  funnel: FunnelStage[];
  daily: DailyPoint[];
  referrers: ReferrerRow[];
  totals: {
    visitors: number;
    signups: number;
    checkouts: number;
    /** Currently in a free trial. */
    trialing: number;
    /** Converted and paying. */
    active: number;
    /** Cancelled but still inside the paid period. */
    cancelling: number;
  };
}

/**
 * Reads the dashboard aggregates. Authorisation is enforced in Postgres — the
 * function raises unless the caller's email is in `admin_emails` — so hiding
 * the UI is a convenience, not the security boundary.
 */
export async function fetchSummary(days = 14): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc('analytics_summary', { days });
  if (error || !data) return null;
  return data as AnalyticsSummary;
}
