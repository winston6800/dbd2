// DeadByDefault Screen Time — background service worker.
//
// Tracks wall-clock time spent on a YouTube watch/shorts page, a Twitch
// channel/VOD page, or X/Twitter generally (a feed has no single "watch"
// URL the way a video does, so any logged-in-looking page counts), but only
// while that tab is the active tab in the focused window AND the system
// isn't idle/locked. Reports accumulated seconds to /api/track-watch-time
// roughly once a minute, authenticated with the sync token pasted in from
// the DeadByDefault Profile tab (see supabase/migrations/006_watch_time.sql
// for why it's a token and not a normal session — this service worker can't
// sign in interactively).

const DEFAULT_API_BASE = 'https://deadbydefault.app';
const HEARTBEAT_ALARM = 'heartbeat';
const IDLE_THRESHOLD_SECONDS = 15;
// A checkpoint should only ever cover ~one heartbeat interval. If the
// machine slept or the worker was suspended for longer than this, that gap
// is not real watch time — cap it rather than crediting hours of "viewing"
// a paused laptop.
const MAX_CHECKPOINT_SECONDS = 180;
// Matches the server's per-write cap (api/track-watch-time.ts); send in
// chunks if a single flush ever accumulates more than this.
const MAX_SECONDS_PER_SEND = 1500;

const TWITCH_NON_CONTENT_PATHS = [
  '/directory', '/search', '/subscriptions', '/wallet', '/settings',
  '/p/', '/login', '/logout', '/broadcast', '/jobs', '/turbo', '/prime', '/downloads',
];

// X has no single "watch" URL the way a video site does — a feed, a
// profile, and DMs are all "usage" — so this excludes only the pages you'd
// visit without actually using the product (auth, marketing, embeds).
const X_NON_USAGE_PATHS = [
  '/login', '/logout', '/i/flow', '/tos', '/privacy', '/about', '/download',
];

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

/** Null when the current focused-window active tab isn't something we count as "watching". */
function classifyUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.hostname.endsWith('youtube.com')) {
    if (url.pathname.startsWith('/watch') || url.pathname.startsWith('/shorts')) return 'youtube';
    return null;
  }

  if (url.hostname.endsWith('twitch.tv')) {
    if (url.pathname.length <= 1) return null; // bare homepage
    if (TWITCH_NON_CONTENT_PATHS.some(p => url.pathname.startsWith(p))) return null;
    return 'twitch';
  }

  if (url.hostname.endsWith('x.com') || url.hostname.endsWith('twitter.com')) {
    if (X_NON_USAGE_PATHS.some(p => url.pathname.startsWith(p))) return null;
    return 'x';
  }

  return null;
}

async function getCurrentPlatform() {
  const idleState = await chrome.idle.queryState(IDLE_THRESHOLD_SECONDS);
  if (idleState !== 'active') return null;

  const windows = await chrome.windows.getAll({ populate: true });
  const focused = windows.find(w => w.focused);
  if (!focused) return null;

  const activeTab = (focused.tabs || []).find(t => t.active);
  if (!activeTab) return null;

  return classifyUrl(activeTab.url);
}

async function addPending(platform, seconds) {
  if (seconds <= 0) return;
  const date = todayStr();
  const { pending = {}, totals = {} } = await chrome.storage.local.get(['pending', 'totals']);

  const pendingDay = pending[date] || { youtube: 0, twitch: 0, x: 0 };
  pendingDay[platform] = (pendingDay[platform] || 0) + seconds;
  pending[date] = pendingDay;

  const totalsDay = totals[date] || { youtube: 0, twitch: 0, x: 0 };
  totalsDay[platform] = (totalsDay[platform] || 0) + seconds;
  totals[date] = totalsDay;

  // Keep local history from growing forever — two weeks is plenty for a
  // popup that only ever shows "today".
  const cutoff = Date.now() - 14 * 86400_000;
  for (const key of Object.keys(totals)) {
    if (new Date(key).getTime() < cutoff) delete totals[key];
  }

  await chrome.storage.local.set({ pending, totals });
}

async function checkAndUpdateState() {
  const platform = await getCurrentPlatform();
  const now = Date.now();
  const { session } = await chrome.storage.local.get('session');

  if (session) {
    const elapsed = Math.min(MAX_CHECKPOINT_SECONDS, Math.max(0, Math.floor((now - session.since) / 1000)));
    await addPending(session.platform, elapsed);
  }

  if (platform) {
    await chrome.storage.local.set({ session: { platform, since: now } });
  } else if (session) {
    await chrome.storage.local.set({ session: null });
  }
}

async function flushPending() {
  const { apiBaseUrl, syncToken, pending = {} } = await chrome.storage.local.get(['apiBaseUrl', 'syncToken', 'pending']);
  if (!syncToken) return;
  const base = (apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, '');

  for (const [date, byPlatform] of Object.entries(pending)) {
    for (const platform of ['youtube', 'twitch', 'x']) {
      let seconds = byPlatform[platform];
      while (seconds > 0) {
        const chunk = Math.min(seconds, MAX_SECONDS_PER_SEND);
        let ok = false;
        try {
          const res = await fetch(`${base}/api/track-watch-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${syncToken}` },
            body: JSON.stringify({ platform, seconds: chunk, date }),
          });
          ok = res.ok;
        } catch {
          // Offline or the API is unreachable — leave the rest pending for
          // the next heartbeat rather than losing it.
          break;
        }
        if (!ok) break;

        // Re-read before subtracting — checkAndUpdateState may have added
        // more to this exact date/platform while the request was in flight.
        const { pending: latest = {} } = await chrome.storage.local.get('pending');
        if (latest[date]) {
          latest[date][platform] = Math.max(0, (latest[date][platform] || 0) - chunk);
          await chrome.storage.local.set({ pending: latest });
        }
        seconds -= chunk;
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== HEARTBEAT_ALARM) return;
  checkAndUpdateState().then(flushPending);
});

chrome.tabs.onActivated.addListener(() => void checkAndUpdateState());
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') void checkAndUpdateState();
});
chrome.windows.onFocusChanged.addListener(() => void checkAndUpdateState());
chrome.idle.onStateChanged.addListener(() => void checkAndUpdateState());
