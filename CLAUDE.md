# Portal Space Leaderboard

## What this is
A two-screen live leaderboard for a Portal 2 speed-run competition hosted by Portal Space Systems.

- `/admin` — operator view, white UI, password protected
- `/stream` — public display, dark branded UI, auto-updates in real time

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres DB + real-time subscriptions)
- Deployed on Vercel

## Env vars required
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=choose_a_password
```

---

## Supabase setup
Run this SQL in your Supabase dashboard → SQL Editor:

```sql
create table players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  state text default 'pending',   -- 'pending' | 'live' | 'done'
  start_ms bigint,
  final_ms bigint,
  created_at timestamptz default now()
);

alter table players enable row level security;
create policy "Public read" on players for select using (true);
create policy "Public write" on players for all using (true);
```

---

## Routes

### /admin
- On load: show a simple centered password prompt
- Check password against `ADMIN_PASSWORD` env var via a `/api/auth` POST route
- On success: store `authed=true` in sessionStorage so refresh doesn't re-prompt
- White background (#fff), Inter font, clean minimal UI

**Admin UI — player list:**
- Text input + "Add player" button at the top (Enter key also submits)
- Each player renders as a row with: rank badge, name, live timer display, action button, delete button
- States per player:
  - `pending` → show "Record" button (starts the timer)
  - `live` → show running timer in red + "Stop" button
  - `done` → show locked final time + "Done" badge
- Rank badges update automatically as times come in (gold/silver/bronze for top 3)
- One attempt per player — no re-runs once stopped

**Timer logic:**
- Clicking Record: PATCH player → `state: 'live', start_ms: Date.now()`
- Clicking Stop: PATCH player → `state: 'done', final_ms: Date.now() - start_ms`
- Live timer display ticks client-side using `Date.now() - start_ms` in a setInterval
- Use a single shared interval (not one per player) to avoid performance issues

### /stream
- Black background (#000), white text, Inter font
- Subscribes to Supabase real-time on the `players` table — updates instantly, no polling
- Header: eyebrow "Portal Space Systems", title "Portal Space Leaderboard"
- Live clock (HH:MM:SS) top right
- Top 3 finishers → gold/silver/bronze podium cards
- 4th place and below → clean ranked table
- Sorted by `final_ms` ascending (fastest time = 1st)
- Podium adjusts: 1 card if only 1 finisher, 2 if 2, full 3 when 3+
- Shows "Waiting for results..." subtitle until first run is done

---

## Design tokens
- Font: Inter via Google Fonts (weights 300, 400, 500, 700)
- Admin bg: #ffffff, text: #111111, muted: #999999, border: #e0e0e0
- Stream bg: #000000, text: #ffffff, muted: #444444
- Gold: #C89B20 / gold-bg: rgba(200,155,32,0.08)
- Silver: #7A9099 / silver-bg: rgba(122,144,153,0.08)
- Bronze: #8B5A2B / bronze-bg: rgba(139,90,43,0.08)
- Live/active red: #cc3333
- No gradients, no shadows, no animations — flat and clean throughout

---

## File structure to build
```
/app
  /admin
    page.tsx
  /stream
    page.tsx
  /api
    /auth
      route.ts        ← POST: validate password
    /players
      route.ts        ← GET all players, POST new player
    /players/[id]
      route.ts        ← PATCH player state, DELETE player
/lib
  supabase.ts         ← createClient (uses env vars)
/public
  (no assets needed)
package.json
.env.local            ← not committed, user fills this in
```

---

## Notes
- No user accounts needed — single shared admin password is fine
- Real-time on stream view should use Supabase `channel().on('postgres_changes')` subscription
- Admin view does NOT need real-time — it's the source of truth, just reads/writes directly
- Keep component count low — each route can be a single file with no sub-components
- No external UI libraries — plain HTML/CSS with Tailwind or inline styles only
