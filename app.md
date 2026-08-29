# DeadByDefault — functionality

## Access

Two gates stand in front of the app, in order:

1. **Sign in** (`AuthScreen`) — email and password via Supabase. Sign-up sends a confirmation email;
   the account is not usable until the link is clicked.
2. **Start a trial** (`SubscriptionGate`) — Stripe Checkout in `subscription` mode with a 3-day free
   trial. A card is collected up front so the trial converts on its own; the gate says so plainly. On
   return from Checkout the app waits 3 seconds for the webhook to land, then re-reads the
   subscription.

Access is granted while the subscription status is `trialing` or `active`. Cancelling sets
`cancel_at_period_end` and access continues until the period ends — the user keeps what they paid
for.

Emails listed in `VITE_ADMIN_EMAILS` skip the second gate entirely. A separate list,
`VITE_ANALYTICS_EMAILS`, controls who sees the Analytics link — the two are intentionally not the
same list, since skipping the paywall and seeing business data are different privileges.

Signed-in users get an account row in the header: a trial countdown while trialing, a "cancels at
period end" marker after cancelling, **Analytics** (admins only), **Manage** (the Stripe billing
portal, where cancelling happens), and **Sign out**. The countdown is deliberately visible — the card
is charged automatically, so nobody should be surprised by it.

## Screens (tabs)

Six tabs, `Layout.tsx`'s nav bar:

### Command
The daily loop, and where every session starts.

- **Growth Objective + Survival Pulse** — one combined card. An editable one-line goal (e.g.
  "INCREASE DAILY UNIQUE VISITORS", click to edit) sits above a 7-day heatmap; color interpolates
  from the chosen theme color at low volume to white-hot at high volume, with a checkmark overlay on
  days the Honor Code was kept and today's cell ringed in the theme color. Six color-theme swatches
  (top right of the card, `lib/growth/themes.ts`) recolor the streak badge, the "Growth Objective"
  label, and the heatmap together — pick one to represent whatever this objective is, so a different
  goal can look different. Hovering the card shows the objective name as a tooltip. An optional
  website link sits below the heatmap.
- **Growth Terminal** — +/- buttons logging today's loop count, and the **Honor Code Entry** button:
  a confirmation modal asking whether the user actually shipped something today, with an optional
  note. Marking it kept (or later revoking it) recalculates the streak immediately.
- **Screen Time Today** — today's YouTube and Twitch minutes, reported automatically by the
  companion browser extension (`extension/`) rather than typed in. Polls every 30 seconds; shows
  "Nothing synced yet" until the extension is installed and paired via the code on Profile.
- **Take a Break** — toggles maintenance mode for today, which does not break the streak but greys
  out the terminal and marks the day as a rest day on the heatmap instead of a zero.

### Feed
Activities from people you follow and people in your groups, today only: shipped (with note),
logged N loops, or took a break. Each activity can take one of four emoji reactions (🔥🚀💪👏); one
reaction per person per activity, toggleable.

### Discover
Founders to follow: members of your groups you are not already following, plus anyone decoded from a
follow link pasted into **Add follow link**. Search filters by name.

### Groups
Create a group to get a shareable join link (`?join=<base64>`); anyone who opens it and enters a name
joins with a live-updating snapshot of their state. Also lists who you follow (via a similar
`?follow=<base64>` link from their Profile tab), with an unfollow control.

### Analytics (Achievements)
Read-only stats: total loops, streak, average daily loops, "conversion resilience", and four
survival milestones (3-day streak, 7-day streak, 10,000 total loops, 30 morning logs) with progress
bars. Not to be confused with the admin analytics dashboard behind the header's **Analytics** link —
that one is business metrics (signups, funnel, MRR), this one is the user's own game stats.

### Profile
Display name (editable, used everywhere the person appears to others) and a **Copy follow link**
button. Below that, **Screen Time Sync**: a per-account pairing code for the browser extension, with
a copy button and a regenerate button (regenerating disconnects whatever old copy of the extension
was using the previous code). Below that, the same heatmap as Command but zoomable: Week / Month /
Year / All, with a year picker for the "All" view.

## Interactions

1. **Log a loop.** +/- on Command. Positive deltas fire `track('loop_logged')`, add to today's
   `dailyUvs`, and recompute the streak. Negative deltas floor at 0 and never go below it.
2. **Honor Code.** The confirmation modal is the only way to flip `dailyShipped` for today; there is
   no direct toggle. Marking it kept fires `track('honor_code_kept')`.
3. **Break days.** Toggling maintenance writes `dailyInfrastructureFocus[today]` and recomputes the
   streak with that day counted as active (a break does not cost the streak).
4. **Groups and following.** Both are link-based, not account-lookup-based: the whole `UserState` of
   the person being joined/followed rides along in the URL. Opening someone's join link a second time
   (already a member) just syncs your state into the existing group instead of prompting again.
5. **Dev menu.** The terminal-icon button (bottom-right, every screen) seeds 30 or 365 days of random
   history, or resets the signed-in user's local data. Visible to any signed-in user — it only ever
   touches that user's own storage, never someone else's.

Not implemented, by design: multiple growth objectives per account; editing past days; a server-side
directory for groups/following (it is link-based); mobile-specific layout beyond what Tailwind's
responsive classes give for free.

## State

```
UserState: { defaultKpi, websiteUrl?, growthObjective?, streak, growthDates[], dailyUvs, dailyGrowthActions,
             dailyInfrastructureFocus, dailyShipped, dailyShipNote?, stats, achievements[], currentUvs,
             isOnMaintenance, minThreshold }
```

Persisted to `localStorage` under `dbd_state_v1:<userId>` after every change and restored on mount.
Groups (`dbd_groups_v2:<userId>`), following (`dbd_following_v1:<userId>`), kudos
(`dbd_kudos_v1:<userId>`), challenges (`dbd_challenges_v1:<userId>`), the discovery link list
(`dbd_discovery_list_v1:<userId>`), and the display name (`dbd_display_name:<userId>`) are separate
keys, all scoped the same way — switching accounts on a shared device never leaks one person's data
into another's. See `lib/growth/storage.ts`.

## Streak math

`calculateCurrentStreak` (`lib/growth/utils.ts`) merges three date sources — loop-logged days, break
days, and Honor Code days — into one active-dates set, then counts backward from today (or yesterday,
so logging late at night doesn't zero an active streak) while consecutive days hold. One gap ends it.
