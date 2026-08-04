# Monster Goals

A goal-tracking app reframed as a boss fight. Name one big goal (the "monster"), break it into
mini-bosses (sub-goals), and add tasks under the active mini-boss. Checking off a task deploys a
"Milk" unit into orbit around the active boss, where it fires pellets forever. Each completed task
takes 12 HP off the boss. At 0 HP the boss plays a defeat animation, drops into a faded graveyard
trail, and the next sub-goal becomes active.

Access is gated: users must sign in **and** hold an active subscription before they see the board.

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
explains the product and states the price, then sign in, then subscribe, then the board:

```
Landing → AuthScreen → SubscriptionGate → MonsterGoalsApp
```

| Piece | File |
|---|---|
| Marketing page for logged-out visitors | `components/Landing.tsx` |
| Supabase session + subscription state | `lib/auth.tsx` |
| Supabase client, subscription lookup | `lib/supabase.ts` |
| Email/password sign in & sign up | `components/AuthScreen.tsx` |
| $20/month paywall | `components/SubscriptionGate.tsx` |
| Billing portal & sign out | `components/MonsterGoals/AccountBar.tsx` |
| Stripe Checkout session | `api/create-checkout-session.ts` |
| Stripe billing portal session | `api/create-portal-session.ts` |
| Stripe webhook → `subscriptions` table | `api/stripe-webhook.ts` |
| `subscriptions` table + RLS | `supabase/migrations/001_subscriptions.sql` |

A user is let through when `subscriptions` holds a row for them with status `active` or `trialing`.
That row is written only by the Stripe webhook using the service-role key; RLS lets users read their
own row and nothing else.

### Setup

1. **Supabase** — create a project, run **both** migrations in `supabase/migrations/` (`001_subscriptions.sql`
   and `002_goals.sql`), and enable the email/password provider.
2. **Stripe** — create a $20/month recurring price and copy its price ID into `STRIPE_PRICE_ID`.
3. **Webhook** — point a Stripe webhook at `/api/stripe-webhook` subscribing to
   `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
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

1. Run **both** Supabase migrations — `002_goals.sql` is what makes a paid account work on a second
   device. Without it every cloud read fails and the board silently falls back to device-local storage.
2. Set `VITE_APP_URL` on the deployment. It is baked into the OG tags at build time; if it is unset,
   link previews on Reddit, Twitter and Slack will not resolve `og.png`.
3. Confirm the Stripe webhook is live and pointed at `/api/stripe-webhook`. If it is not, payments
   succeed but nobody is ever let in — subscriptions are written by the webhook alone.
4. Take a real payment with a live card and confirm you land on the board. The Checkout → webhook →
   `subscriptions` row → gate path cannot be tested locally without live keys.
5. Sign up on a phone. The board is scaled, not reflowed, so text is small on a 390px screen — decide
   whether that is acceptable before sending mobile traffic to it.

## Known gaps

- **No trial and no free tier.** Cold traffic has to pay $20 before seeing the board. The landing page
  now explains the product and the price up front, which is the main thing that was missing, but a
  hard gate still converts far worse than a trial. Worth revisiting if signups stall.
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
