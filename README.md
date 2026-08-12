# Frontier

A thinking net for the thing you are trying to make that does not exist yet.

Chat is the wrong shape for invention. Real thinking branches, collides and dead-ends, but a chat app
gives you hundreds of orphaned transcripts with no structure between them. Frontier makes the
structure the primary object: an Obsidian-style graph where every node is one conversation with one
agent, wired into a **plot** — a single sentence naming the thing that does not exist yet.

The loop:

1. **Declare a plot.** One sentence. Not a goal — a thing.
2. **The root opens.** The Cartographer separates what is already shipping from what is genuinely
   unexplored, and names the sliver that is actually new.
3. **Take a fork.** Every agent ends its turn proposing 2–4 genuinely divergent directions. Taking
   one grows a new node wired to its parent.
4. **The net grows outward.** Unexplored leaves glow; that glow is the frontier.
5. **Collide distant branches.** The Synthesist takes two nodes from opposite sides of the net and
   forces a structural connection. This is the feature that justifies the graph existing at all.

Access is gated: users must sign in **and** hold a subscription before any agent turn runs. New users
get a **3-day free trial**; a card is taken up front and charged $20/month when the trial ends unless
they cancel first.

## The roster

Five agents, not one assistant. A single general-purpose assistant converges on the median of what
has been written on a subject, which is the opposite of a frontier — so each agent gets one job, one
refusal, and a bias toward pushing outward.

| Agent | Job |
|---|---|
| **Cartographer** | Separates solved from known-unsolved from unexplored, and names the real unknown. |
| **Adversary** | Attacks the single load-bearing assumption, and names a test that settles it this week. |
| **Synthesist** | Collides two distant nodes and states what falls out that neither could reach alone. |
| **Artificer** | Converts the thread into the smallest artifact that teaches something unpredictable. |
| **Historian** | Names specific prior attempts, what killed them, and which input has actually changed since. |

Prompts live in `lib/net/agents.ts`. They are the product, not scaffolding — the shared preamble is
what stops all five collapsing back into "helpful assistant" under pressure.

## Architecture

| Path | Role |
|---|---|
| `lib/net/types.ts` | `Plot`, `ConvNode`, `Fork`, `Message`, `NetState`. |
| `lib/net/agents.ts` | The roster, context assembly, and the tolerant `FORKS` parser. |
| `lib/net/ops.ts` | Every mutation of the net as a pure function (fork, collide, delete, resolve). |
| `lib/net/frontier.ts` | Heat scoring, ancestor/descendant walks, collision candidate ranking. |
| `lib/net/graph.ts` | Deterministic force-directed layout. |
| `lib/net/sync.ts` | localStorage cache + Supabase `nets` table. |
| `api/agent-turn.ts` | The **only** path to the model. Holds the key, enforces entitlement. |
| `components/Frontier/` | Canvas, conversation panel, plot setup, app shell. |

Two properties are load-bearing and are asserted in tests:

- **Layout is deterministic.** A force layout seeded with `Math.random` re-arranges itself on every
  mount, destroying the one thing a spatial view is for — you remembering where things are. Same net
  in, same picture out.
- **The paywall is server-side.** The client gate is a UX affordance. `api/agent-turn.ts` verifies the
  session token and re-checks the subscription before spending a token, because the Supabase anon key
  is public and the alternative is an unmetered inference farm on your card.

## Setup beyond Supabase

Frontier needs one extra secret over the old board:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Server-side only — it is read by `api/agent-turn.ts` and never reaches the bundle. Without it the
agents return 500 and the net cannot grow.

Apply `supabase/migrations/006_nets.sql` to create the `nets` table (one JSON row per user, RLS
scoped to the owner).

## Legacy: Monster Goals

This repo previously shipped **Monster Goals**, a goal tracker shaped like a boss fight. Its code
still lives under `components/MonsterGoals/` and `lib/monster/`, and `supabase/migrations/002_goals.sql`
is deliberately left in place rather than dropped — no data is migrated between the two, and the old
`goals` rows are untouched. Sections below marked *Game code* describe that app. The auth, billing,
webhook, and analytics layers are shared and current.

## Quick start

```bash
npm install
cp .env.example .env         # fill in Supabase + ANTHROPIC_API_KEY
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
explains the product and states the price, then sign in, then start a trial, then the board:

```
Landing → AuthScreen → SubscriptionGate → MonsterGoalsApp
```

| Piece | File |
|---|---|
| Marketing page for logged-out visitors | `components/Landing.tsx` |
| Supabase session + entitlement state | `lib/auth.tsx` |
| Supabase client, entitlement + trial helpers | `lib/supabase.ts` |
| Email/password sign in & sign up | `components/AuthScreen.tsx` |
| Trial + $20/mo paywall | `components/SubscriptionGate.tsx` |
| Trial countdown, cancel link, sign out | `components/MonsterGoals/AccountBar.tsx` |
| Test/live credential resolution | `api/_stripe.ts` |
| Stripe Checkout (`mode: subscription`, trial) | `api/create-checkout-session.ts` |
| Stripe billing portal — where users cancel | `api/create-portal-session.ts` |
| Stripe webhook → `subscriptions` table | `api/stripe-webhook.ts` |
| `subscriptions` table + RLS | `supabase/migrations/005_subscriptions_trial.sql` |
| Lifecycle tests | `api/stripe-webhook.test.ts`, `lib/entitlement.test.ts` |

### How entitlement works

A user is let through when `subscriptions` holds a row for them with status **`trialing`** or
**`active`**. Everything else — `past_due`, `canceled`, `unpaid`, `incomplete` — does not grant
access. The row is written only by the Stripe webhook using the service-role key; RLS lets users read
their own row and nothing else.

The lifecycle, and what each step does to access:

| What happens | Stripe sends | Row becomes | Access |
|---|---|---|---|
| Checkout completes | `checkout.session.completed` | `trialing`, `trial_end` set | ✅ |
| Trial ends, card charged | `customer.subscription.updated`, `invoice.paid` | `active` | ✅ |
| User cancels in the portal | `customer.subscription.updated` | `active` + `cancel_at_period_end` | ✅ until period end |
| Period actually ends | `customer.subscription.deleted` | `canceled` | ❌ |
| Renewal charge fails | `invoice.payment_failed` | `past_due` | ❌ |
| Trial ends with no card | `customer.subscription.deleted` | `canceled` | ❌ |

Cancelling is **not** immediate by design: the user keeps what they paid for until the period ends.

Every write upserts on `user_id`, so a redelivered event is harmless — Stripe retries, and it must be
safe when it does.

**`public.purchases` is dead** (the one-time model). It is empty and unused; drop it when ready:
`drop table public.purchases;`

### Setup

1. **Supabase** — create a project, run the migrations in `supabase/migrations/` in order, and enable
   the email/password provider. `001` and `004` are historical (the original subscription shape and
   the one-time-payment experiment); `005` supersedes both and is the one that matters.
2. **Stripe** — create a **recurring monthly** $20 price. A one-off price will not work: Checkout
   rejects it in `subscription` mode. Put its id in `STRIPE_PRICE_ID_TEST` / `_LIVE`.
3. **Webhook** — point a Stripe webhook at `/api/stripe-webhook` subscribing to:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.paid`,
   `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET_TEST` / `_LIVE`.
   **Create two endpoints** — one in test mode, one in live — each with its own secret.
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

## Testing the subscription end to end

The automated suite (`api/stripe-webhook.test.ts`) drives the handler through the whole lifecycle
using Stripe's event shapes, so the **logic** is covered: trial start, conversion, cancel-then-lapse,
payment failure, redelivery. What it cannot cover is Stripe's own behaviour — that a trial really
converts after 3 days, that the price is configured right, that signatures verify. Those need a real
test-mode run:

```bash
# 1. Forward test-mode events to a local dev server. This prints a
#    whsec_... — use it as STRIPE_WEBHOOK_SECRET_TEST.
stripe listen --forward-to localhost:3000/api/stripe-webhook

# 2. Start a trial through the UI, paying with the test card 4242 4242 4242 4242.
#    The row should appear as `trialing`.

# 3. Fast-forward the trial instead of waiting 3 days. In the Stripe dashboard:
#    Billing → Subscriptions → the subscription → "Advance test clock",
#    or attach it to a test clock at creation and advance that.
#    Expect: status flips to `active`, invoice.paid arrives, card is charged.

# 4. Cancel from the app's "Manage subscription" link.
#    Expect: cancel_at_period_end = true, status still `active`, access retained.

# 5. Advance the clock past current_period_end.
#    Expect: customer.subscription.deleted, status `canceled`, gate returns.
```

Individual events can also be replayed without the UI:

```bash
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

Check the result after each step with:

```sql
select status, trial_end, current_period_end, cancel_at_period_end
from public.subscriptions;
```

### Verifying live mode without paying

Test mode proves the code. It cannot prove the live wiring, because test and live are separate
universes in Stripe — separate keys, prices, webhook endpoints and signing secrets. These only ever
fail in live:

| Failure | Symptom |
|---|---|
| Live price ID missing (created in test only) | Checkout 500s |
| Live webhook not created, or wrong URL | **Card charged, no access** |
| Live signing secret mismatched | Every event 400s, same result |
| `STRIPE_MODE` still `test` in production | Startup throws, or wrong keys used |
| Stripe account not activated for live charges | Cannot charge at all |
| Vercel env var scoped to Preview, not Production | Works in preview, dies in prod |

**First, check the config without any transaction.** Set `HEALTH_CHECK_TOKEN` to a long random
string, then:

```bash
curl "https://deadbydefault.app/api/stripe-health?token=YOUR_TOKEN"
```

It verifies the API key works, the account is enabled for charges, the price exists **in this mode**
and is recurring, and that a webhook endpoint is subscribed to the events the app needs. That catches
every live-only misconfiguration except a mismatched signing secret, which only a delivered event can
prove. The endpoint 404s unless the token is set.

**Then confirm end to end — the trial makes this free.** Live checkout charges nothing up front, so:

1. Set `STRIPE_MODE=live` on Production with the live key, price ID and webhook secret.
2. Sign up with a real card on an email that is **not** in `VITE_ADMIN_EMAILS` — an admin email skips
   the gate and the test proves nothing.
3. Checkout completes. $0 is charged and the subscription is created as `trialing`.
4. Confirm the webhook landed:
   `select status, trial_end from public.subscriptions;` → `trialing`, and the board loads.
5. Cancel via **Manage subscription**. You are never charged.

That exercises the live price, webhook, signing secret, entitlement write and cancel path for nothing.

The only thing left uncovered is the conversion charge itself, three days later. Stripe test clocks
are test-mode only, so live cannot be time-warped. Either verify conversion in test mode with a test
clock (the logic is identical — only credentials differ), or let one live trial convert and refund the
$20 from the dashboard. Stripe generally does not return the processing fee on a refund, so that costs
roughly the fee rather than the twenty.

## Security

A few things worth knowing about how access is enforced, and one real bug fixed here:

- **Checkout and the billing portal verify the caller's session — they no longer trust a client-
  supplied id.** Both endpoints used to take a `userId` straight from the request body. Since the
  Supabase anon key is public, anyone could POST an arbitrary `userId` and get back a stranger's
  Stripe billing portal link (their card, invoices, and a cancel button), or overwrite a stranger's
  `subscriptions` row via the webhook (it upserts on `user_id`). Both endpoints now verify the
  `Authorization: Bearer <token>` header against Supabase's auth server (`api/_auth.ts`) and use only
  the identity that comes back — never anything in the body. Covered by `test/api-auth.test.ts` and
  `test/create-portal-session.test.ts`.
- **RLS is default-deny.** `admin_emails` has row-level security enabled with zero policies, which
  means nobody can read or write it through the API at all — not even a logged-in user. The one path
  in is the `analytics_summary()` function, which runs as the table owner and checks the caller's
  email itself before returning anything.
- **The service role key never reaches the browser.** It is read only in `/api` functions
  (`SUPABASE_SERVICE_ROLE_KEY`, no `VITE_` prefix), which Vite never bundles into client code.
- **Webhook signatures are verified before anything is trusted.** `stripe-webhook.ts` rejects any
  request that doesn't verify against `STRIPE_WEBHOOK_SECRET_*` before reading the event body.
- **Anonymous inserts on `analytics_events` are open by necessity** (landing views happen before
  sign-in) and could be spammed. Add a rate limit or move the write behind an edge function if the
  numbers stop looking believable.
- **Manual step:** Supabase's leaked-password check (rejects passwords found in known breaches) is off
  by default. Turn it on in the dashboard: Authentication → Policies → Password Security. Not
  something available through the API used here.

## Launch checklist

Before pointing traffic at this:

1. ~~Run the Supabase migrations~~ — applied to the `dbd2` project (`sswzdbteldmmalebfned`);
   `subscriptions` has the trial-aware shape. Re-run from `supabase/migrations/` on a new project.
2. **Create a recurring monthly $20 price** in both test and live mode, and set
   `STRIPE_PRICE_ID_TEST` / `STRIPE_PRICE_ID_LIVE`. A one-off price breaks checkout outright.
3. **Create two webhook endpoints** — one test, one live — both at
   `https://<your-domain>/api/stripe-webhook`, with the events listed under Setup. Put each signing
   secret in the matching `STRIPE_WEBHOOK_SECRET_*`. If the webhook is not live, checkout succeeds but
   nobody is ever let in: the `subscriptions` row is written by the webhook alone.
4. **Set `STRIPE_MODE`** — `test` on preview deployments, `live` on production. A live key under
   `STRIPE_MODE=test` (or the reverse) fails fast at startup rather than silently taking real money.
5. Run the trial test above in test mode **before** switching production to `live`.
6. Set `VITE_APP_URL` on the deployment, or link previews will not resolve `og.png`.
7. Keep the Supabase project awake. It had paused once, and a paused project means nobody can sign in
   at all. Free-tier projects pause after about a week of inactivity.
8. Sign up on a phone. The board is scaled, not reflowed, so text is small on a 390px screen.
9. Tag the links you post: `?utm_source=reddit`. Reddit's apps often strip the referrer.

## Analytics

An admin-only dashboard lives behind the **Analytics** link in the account row, visible to emails in
`VITE_ANALYTICS_EMAILS`. It shows the landing → CTA → signup → checkout → trial funnel, visitors per
day, traffic sources, and how many accounts are trialing, paying, or cancelling.

| Piece | File |
|---|---|
| Event capture (`track`, `trackOnce`) | `lib/monster/analytics.ts` |
| Dashboard | `components/Analytics/AnalyticsDashboard.tsx` |
| Table, RLS and the summary function | `supabase/migrations/003_analytics.sql` |
| Purchases + updated summary | `supabase/migrations/004_purchases.sql` |

Two things worth knowing:

- **`VITE_ANALYTICS_EMAILS` is deliberately separate from `VITE_ADMIN_EMAILS`.** The admin list only
  skips the paywall; it says nothing about who should see revenue and traffic numbers. Conflating the
  two would show your analytics to anyone ever given a free account for an unrelated reason. Unset,
  nobody sees the link — it fails closed rather than falling back to the admin list.
- **Authorisation is enforced in Postgres, not the UI.** `analytics_summary()` raises unless the
  caller's email is in the `admin_emails` table — currently just `winston6800@gmail.com`. Hiding the
  link via `VITE_ANALYTICS_EMAILS` is convenience only; an email in the env var but not in that table
  sees a "not authorized" state, so keep both in sync.
- **Anonymous inserts are open by necessity.** Landing views happen before sign-in, so the events
  table accepts unauthenticated writes and could be spammed. Fine for a launch; add a rate limit or
  move the write behind an edge function if the numbers stop looking believable.

Attribution is pinned at first contact and kept in `sessionStorage` — by the time someone pays,
`document.referrer` is long gone.

## Known gaps

- **The trial still requires a card.** That converts far better than charging immediately, but worse
  than a no-card trial. It is the reason the trial can auto-convert at all; revisit only if signups
  stall for that specific reason.
- **3 days is short.** `customer.subscription.trial_will_end` fires ~3 days before the trial ends, so
  on a 3-day trial it lands almost immediately. The handler only logs it — if you want a "your trial
  ends tomorrow" email, that hook is where it goes, but the timing needs a longer trial to be useful.
- **Mobile is scaled, not redesigned.** The board is a fixed 800×640 composition per the handoff, so
  `BoardScaler` shrinks it as a unit — on a 390px phone that is roughly half size, and boss labels get
  small. A proper mobile composition would need design input.
- **AI monster naming is stubbed.** `aiMonsterName()` in `lib/monster/naming.ts` always returns
  `null`, so the deterministic local name stands. Wire it to a provider to turn the feature on; the
  UI already handles a name arriving late.
- **One goal per account.** The data model holds a single goal, so the paywall and landing copy
  deliberately promise "unlimited mini-bosses and tasks" rather than unlimited goals. Keep it that way
  until multiple goals actually ship.
- **No analytics.** Nothing measures how many landing-page visitors start checkout, which is the
  number you will want on day one of a Reddit push.
- **Auth, billing and landing screens are an extension.** The design handoff explicitly did not cover
  them. They are built from the documented tokens but have not been through design review.
