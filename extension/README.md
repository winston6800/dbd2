# DeadByDefault Screen Time

A small browser extension that tracks time spent actually watching YouTube
(`/watch`, `/shorts`), Twitch (any channel/VOD page, not the homepage), or
using X/Twitter generally (a feed has no single "watch" page the way a video
does, so any page beyond login/marketing counts), and reports it into your
DeadByDefault streak — the Command tab's **Screen Time Today** card.

It only counts time while the tab is the *active* tab in the *focused*
window and the system isn't idle or locked, checked every minute. Background
tabs, unfocused windows, and walking away from your desk don't count.

## Install (unpacked — this isn't published to a web store)

1. Clone or pull this repo.
2. Open `chrome://extensions` (or `edge://extensions` on Edge).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this `extension/` folder.

## Connect it to your account

1. Sign in to DeadByDefault and open the **Profile** tab.
2. Under **Screen Time Sync**, copy the code shown there.
3. Click the extension's icon in your browser toolbar, paste the code into
   **Sync code**, and click **Save**.
4. If you're running against a local dev server instead of the deployed app,
   change **API base URL** to `http://localhost:3000` first.

The popup shows today's tracked minutes immediately from local storage; it
takes up to a minute for a fresh session to show up on the Command tab,
since that's the sync interval.

## How it works

- `background.js` (a Manifest V3 service worker) checks the focused window's
  active tab once a minute, plus on tab/window/idle-state changes, and
  classifies it as `youtube`, `twitch`, `x`, or neither.
- Elapsed seconds accumulate in `chrome.storage.local` under `pending`
  (unsynced) and `totals` (everything ever tracked locally, for the popup).
- Every heartbeat, unsynced seconds are POSTed to
  `/api/track-watch-time` with your sync code as a bearer token. A failed
  request just leaves the seconds pending for the next attempt — nothing is
  lost to a dropped connection.
- The sync code is *not* your DeadByDefault password or a Supabase session —
  it's a separate opaque token (`sync_tokens` table) that only this
  extension needs, and only lets someone add watch-time rows to your
  account, nothing else. Regenerate it from Profile any time to disconnect
  a copy you no longer trust (an old laptop, etc).

## Known limitations

- Manifest V3 service workers can be killed and restarted by the browser at
  any time. State is persisted to `chrome.storage.local` on every check so a
  restart loses at most the last few seconds, not the whole session.
- The Twitch "is this a content page" check and the X "is this actual usage"
  check are both short exclude-lists (`/directory`, `/search`, `/login`, …),
  not real classifiers — an unlisted path could get miscounted either way.
- No Firefox manifest yet; this is Chrome/Edge (Manifest V3) only.
