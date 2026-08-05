# Monster Goals — functionality

## Access

Two gates stand in front of the game, in order:

1. **Sign in** (`AuthScreen`) — email and password via Supabase. Sign-up sends a confirmation email;
   the account is not usable until the link is clicked.
2. **Buy access** (`PurchaseGate`) — a single $20 payment via Stripe Checkout (`mode: payment`). On
   return from Checkout the app waits 3 seconds for the webhook to land, then re-reads the purchase.
   Access never expires, so there is nothing to renew or cancel.

Emails listed in `VITE_ADMIN_EMAILS` skip the second gate entirely.

Signed-in users get an account row above the board: their email, **Analytics** (admins only), and
**Sign out**. There is no billing link — a one-time purchase has nothing to manage.

## Screens

### Create Goal (empty state)
First run. A floating monster, a text field, and **Summon Monster**. Naming a goal creates
`{ name, monsterName, miniBosses: [] }` and reveals the board. New users always land here — there is
no demo data.

### Battle Board
The working view. Top to bottom:

- **Header** — goal name and progress (`"{n} of {total} mini-bosses defeated"`, or
  `"No mini-bosses yet — add one to begin"`), plus **+ New Sub-Boss**.
- **Board** (800×640) — the goal monster looming at the top, the active mini-boss centred, upcoming
  bosses stacked and blurred on the right, defeated bosses in a faded trail along the bottom, all
  chained by connector lines. Milk units orbit the active boss.
- **Add-sub-boss form** — appears inline while adding.
- **Add-task bar** — a dark terminal strip labelled `QUEUE ORDER`.
- **Task queue** — the checklist for the active boss, undone tasks first.
- **Victory banner** — once every mini-boss is defeated.

## Interactions

1. **Add a sub-boss.** Both **+ New Sub-Boss** and the dashed `+` node on the board open the same
   inline form. The new boss is inserted at `activeIndex + 1` — mid-chain, never as a branch — with
   100 HP and no tasks. If it is the first one, it becomes active.
2. **Add a task.** Appended to the active boss's list via the terminal bar.
3. **Complete a task** — the core loop. Checking an unchecked box:
   - marks the task done and takes `MILK_DMG = 12` HP off the active boss (floored at 0),
   - spawns a hit particle at the boss (600ms),
   - adds a Milk unit to the orbit, which fires pellets from then on.

   Pellets are decorative — they never apply damage. Completed tasks cannot be un-checked; deploying
   a Milk is one-way.
4. **Boss defeat.** At 0 HP the boss is marked defeated and plays the 1300ms `bossDefeat` animation at
   full size and centre. After it finishes the board advances to the first non-defeated boss and the
   old boss re-renders into the graveyard trail. Its Milks go with it.
5. **Select a boss.** Clicking any node makes it active; its tasks load into the queue.
6. **Hover a boss.** Shows the sub-goal text the user actually typed, as a dark tooltip.
7. **Monster naming.** Names are generated from the goal text: the longest non-stopword root,
   truncated to 6 characters and capitalised, plus a hash-picked suffix and title — e.g. "Build base
   mileage" becomes "Mileagoloth the Endless". Deterministic, so the same text always yields the same
   name. An AI-generated name can replace it asynchronously; it never blocks the UI.

Not implemented, by design: editing or deleting goals, bosses or tasks; un-checking; multiple goals
per account; mobile layout.

## State

```
goal: { name, monsterName, miniBosses: [ { id, name, goalText, maxHp, hp, defeated, tasks: [ { id, text, size, done } ] } ] } | null
activeIndex, addingBoss, attackFx, defeatingId, hoverBossId
```

Everything else — defeated count, all-defeated flag, node positions, connector lines, the Milk list,
checklist order — is derived at render time, never stored.

`{ goal, activeIndex }` is written to `localStorage` under `monsterGoalsAppState:<userId>` after every
mutation and restored on mount. Ids come from `lib/monster/ids.ts` and must never change once
assigned: each monster's face, each carton's tint, and each unit's firing pattern are hashes of the id,
so a changed id changes how things look.

## Determinism

Four things are keyed off a character-sum hash, so the board looks stable across reloads:

| Hash of | Picks |
|---|---|
| boss id + index | one of 4 face variants |
| task id | one of 4 carton body/cap tints |
| task id | one of 4 carton expressions |
| task id | one of 4 pellet firing patterns |
