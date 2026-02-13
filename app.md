# DeadByDefault - Growth Protocol

A survival-style growth tracker for founders and builders. Track daily loops, streaks, and ship status. Share progress with groups and followers via links—no backend or API keys required.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

No API keys or environment variables needed.

---

## Core Features

### Command (Home)
- **Survival Pulse** – Heatmap of the last 7 days (loops, shipped, break days)
- **Growth Objective** – Editable goal (e.g. "INCREASE DAILY UNIQUE VISITORS")
- **Website** – Optional link to your project
- **Growth Terminal** – +/- buttons to log daily loops
- **Honor Code Entry** – Mark whether you shipped something today
- **Take a Break** – Toggle maintenance/recovery mode (doesn’t break streak)

### Analytics
- Total units, streak, avg daily, conversion rate
- Achievement progress (Survival Instinct, Default Alive, Network Effect, First Mover)

### Profile
- **Display name** – Used in groups and when others follow you
- **Copy follow link** – Share a link so others can follow your progress
- **Field Analytics** – Heatmap views (week, month, year, all time)

---

## Groups

### Create a Group
1. Go to **Groups**
2. Tap **Create Group**
3. Enter a name
4. Tap **Copy link** and share it

### Join a Group
1. Open the shared link (e.g. `https://yoursite.com?join=...`)
2. Enter your name
3. Tap **Join**

### How It Works
- Group data is encoded in the URL
- When someone joins, they’re added to the group
- Share the updated link back to the creator so they see new members
- Visiting a join link again updates the group with the latest data

---

## Following

### Share Your Profile
1. Go to **Profile**
2. Tap **Copy follow link**
3. Share the link (e.g. `https://yoursite.com?follow=...`)

### Follow Someone
1. Open their follow link
2. Tap **Follow**

### How It Works
- Follow links encode your name and current progress
- Followers see your streak, shipped status, and total loops
- Share a new link to update your data for followers
- Unfollow via the X button in the Following list

---

## Data Storage

- All data is stored in **localStorage**
- No backend, database, or API keys
- Data stays on the device

---

## Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev` | Start dev server         |
| `npm run build` | Production build      |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (watch mode)   |
| `npm run test:run` | Run tests once        |
