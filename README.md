# Monster Goals

A goal-tracking app reframed as a boss fight. Name one big goal (the "monster"), break it into
mini-bosses (sub-goals), and add tasks under the active mini-boss. Checking off a task deploys a
"Milk" unit into orbit around the active boss, where it fires pellets forever. Each completed task
takes 12 HP off the boss. At 0 HP the boss plays a defeat animation, drops into a faded graveyard
trail, and the next sub-goal becomes active.

Access is gated: users must sign in **and** have bought access before they see the board. Access is a
single $20 payment — there is no subscription and it does not expire.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev
```

Open http://localhost:3000.

Supabase credentials are required — the app renders the sign-in screen first and cannot get past it
without a working Supabase project. Set `VITE_ADMIN_EMAILS` to skip the paywall for your own account
during development.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Vitest, watch mode |
| `npm run test:run` | Vitest, single run |

## Auth & paywall

The gate lives in `index.tsx` and is deliberately hard — logged-out visitors get a landing page that
explains the product and states the price, then sign in, then pay once, then the board:

```
Landing → AuthScreen → PurchaseGate → MonsterGoalsApp
```

| Piece | File |
|---|---|
| Marketing page for logged-out visitors | `components/Landing.tsx` |
| Supabase session + entitlement state | `lib/auth.tsx` |
| Supabase client, purchase lookup | `lib/supabase.ts` |
| Email/password sign in & sign up | `components/AuthScreen.tsx` |
| $20 one-time paywall | `components/PurchaseGate.tsx` |
| Account row & sign out | `components/MonsterGoals/AccountBar.tsx` |
| Stripe Checkout session (`mode: payment`) | `api/create-checkout-session.ts` |
| Stripe webhook → `purchases` table | `api/stripe-webhook.ts` |
| `purchases` table + RLS | `supabase/migrations/004_purchases.sql` |

A user is let through when `purchases` holds a row for them with status `paid`. That row is written
only by the Stripe webhook using the service-role key; RLS lets users read their own row and nothing
else. There is no expiry to check and nothing to renew.

`checkout.session.completed` and `payment_intent.succeeded` both describe the same payment and either
can be redelivered, so the webhook's write is idempotent — it upserts on `user_id`.

**`public.subscriptions` is dead.** It is empty and no longer read or written. Drop it once you are
happy nothing else needs it: `drop table public.subscriptions;`

### Setup

1. **Supabase** — create a project, run the migrations in `supabase/migrations/` in order, and enable
   the email/password provider. `001_subscriptions.sql` is historical: it is superseded by
   `004_purchases.sql` and can be skipped on a fresh project.
2. **Stripe** — create a **one-time** $20 price and copy its price ID into `STRIPE_PRICE_ID`. A
   recurring price will not work: Checkout rejects it in `payment` mode.
3. **Webhook** — point a Stripe webhook at `/api/stripe-webhook` subscribing to
   `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`. Add `charge.refunded` too if you want
   refunds to revoke access automatically — the handler is already written.
4. **Env** — set every variable in `.env.example`. `VITE_`-prefixed values ship in the browser bundle;
   the rest are server-only and must be set on the deployment (Vercel functions), never in the client.

## Game code

| Piece | File |
|---|---|
| Root state, the core loop, persistence | `components/MonsterGoals/MonsterGoalsApp.tsx` |
| Create Goal screen | `components/MonsterGoals/CreateGoalScreen.tsx` |
| Battle board, bosses, connectors | `components/MonsterGoals/BattleBoard.tsx` |
| Orbiting Milk units and pellets | `components/MonsterGoals/MilkUnit.tsx` |
| Face variants | `components/MonsterGoals/MonsterFace.tsx` |
| Task queue, add-task terminal bar | `components/MonsterGoals/TaskQueue.tsx`, `AddTaskBar.tsx` |
| Board layout math | `lib/monster/layout.ts` |
| Cloud sync (Supabase + local cache) | `lib/monster/sync.ts` |
| Mobile board scaling | `components/MonsterGoals/BoardScaler.tsx` |
| Monster name generation | `lib/monster/naming.ts` |
| Design tokens | `lib/monster/tokens.ts` |
| Keyframes | `styles/monsterGoals.css` |

Every visual is pure CSS — border-radius blobs, clip-path teeth, absolutely positioned divs — plus one
inline SVG for the connector lines. No images, no icon library. The only external asset is the Google
Fonts stylesheet for Kalam and Nunito.

See [app.md](./app.md) for behaviour, and `lib/monster/tokens.ts` for the exact colours and radii.

## Launch checklist

Before pointing traffic at this:

1. ~~Run the Supabase migrations~~ — `001`–`004` are applied to the `dbd2` project
   (`sswzdbteldmmalebfned`), including the `purchases` table. Re-run them from
   `supabase/migrations/` on any new project.
2. Set `VITE_APP_URL` on the deployment. It is baked into the OG tags at build time; if it is unset,
   link previews on Reddit, Twitter and Slack will not resolve `og.png`.
3. **Point the Stripe webhook at `https://<your-domain>/api/stripe-webhook`** and subscribe it to
   `checkout.session.completed`, `payment_intent.succeeded` and `payment_intent.payment_failed`.
   Put the signing secret in `STRIPE_WEBHOOK_SECRET`. If this is not live, payments succeed but nobody
   is ever let in — the `purchases` row is written by the webhook alone.
4. Take a real payment and confirm you land on the board. The Checkout → webhook → `purchases` row →
   gate path cannot be tested locally without keys. Note that a **test-mode** webhook pointed at your
   production domain only works if the deployed app is also running test keys — use a preview deploy
   or `stripe listen --forward-to` instead of putting production into test mode.
5. Keep the Supabase project awake. It had paused, and a paused project means nobody can sign in at
   all. Free-tier projects pause after a week of inactivity.
6. Sign up on a phone. The board is scaled, not reflowed, so text is small on a 390px screen — decide
   whether that is acceptable before sending mobile traffic to it.
7. Tag the links you post: `?utm_source=reddit`. Without it Reddit traffic is only attributable by
   referring domain, which Reddit's apps often strip.

## Analytics

An admin-only dashboard lives behind the **Analytics** link in the account row, visible to emails in
`VITE_ADMIN_EMAILS`. It shows the landing → CTA → signup → checkout → paid funnel, visitors per day,
traffic sources, customers and gross revenue.

| Piece | File |
|---|---|
| Event capture (`track`, `trackOnce`) | `lib/monster/analytics.ts` |
| Dashboard | `components/Analytics/AnalyticsDashboard.tsx` |
| Table, RLS and the summary function | `supabase/migrations/003_analytics.sql` |
| Purchases + updated summary | `supabase/migrations/004_purchases.sql` |

Two things worth knowing:

- **Authorisation is enforced in Postgres, not the UI.** `analytics_summary()` raises unless the
  caller's email is in the `admin_emails` table. Hiding the link via `VITE_ADMIN_EMAILS` is
  convenience only — an email in the env var but not in the table sees a "not authorized" state, so
  set both.
- **Anonymous inserts are open by necessity.** Landing views happen before sign-in, so the events
  table accepts unauthenticated writes and could be spammed. Fine for a launch; add a rate limit or
  move the write behind an edge function if the numbers stop looking believable.

Attribution is pinned at first contact and kept in `sessionStorage` — by the time someone pays,
`document.referrer` is long gone.

## Known gaps

- **No trial and no free tier.** Cold traffic has to pay $20 before seeing the board. The landing page
  explains the product and the price up front, and a one-time price is an easier ask than a
  subscription, but a hard gate still converts worse than a trial. Worth revisiting if signups stall.
- **Mobile is scaled, not redesigned.** The board is a fixed 800×640 composition per the handoff, so
  `BoardScaler` shrinks it as a unit — on a 390px phone that is roughly half size, and boss labels get
  small. A proper mobile composition would need design input.
- **AI monster naming is stubbed.** `aiMonsterName()` in `lib/monster/naming.ts` always returns
  `null`, so the deterministic local name stands. Wire it to a provider to turn the feature on; the
  UI already handles a name arriving late.
- **One goal per account.** The data model holds a single goal, so the paywall and landing copy
  deliberately promise "unlimited mini-bosses and tasks" rather than unlimited goals. Keep it that way
  until multiple goals actually ship.
- **Lifetime access has an open-ended cost.** Boards sync to Supabase forever on a single $20 payment.
  Fine at launch scale; revisit before it is not.
- **No analytics.** Nothing measures how many landing-page visitors start checkout, which is the
  number you will want on day one of a Reddit push.
- **Auth, billing and landing screens are an extension.** The design handoff explicitly did not cover
  them. They are built from the documented tokens but have not been through design review.
