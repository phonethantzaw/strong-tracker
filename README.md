# STRONG — A/B Strength Tracker

Next.js (App Router) + TypeScript + Convex + Clerk, deployed on Vercel. Run with **Bun**.

Log every set, see last session's numbers so you can beat them, flip between standard and
Planet Fitness equipment, and run rest timers. Data syncs to your account across devices.

---

## What you build, in order

You'll create 4 free accounts and wire them together. Do it in this order — each step produces
a value the next step needs.

| Service | Why | What you copy out |
|---|---|---|
| **GitHub** | host the repo, Vercel deploys from it | — |
| **Convex** | database + reactive backend | `NEXT_PUBLIC_CONVEX_URL`, prod deploy key |
| **Clerk** | sign-in for you + friends | publishable key, secret key, **Issuer URL** |
| **Vercel** | hosting | — |

---

## 1. Local setup

```bash
# from this folder
bun install

# start Convex (first run logs you in + creates the project,
# and writes NEXT_PUBLIC_CONVEX_URL into .env.local automatically)
bunx convex dev
```

Leave that running. In a second terminal:

```bash
cp .env.local.example .env.local   # then fill in the Clerk keys (next step)
bun run dev                         # http://localhost:3000
```

## 2. Clerk

1. Create a Clerk application (enable **Google** and/or **Email** as sign-in methods — best for
   non-technical friends).
2. **API Keys** → copy the **Publishable key** and **Secret key** into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. In the Clerk dashboard, open the **Convex integration** and click **Activate**. It reveals a
   **Frontend API / Issuer URL** (dev format: `https://verb-noun-00.clerk.accounts.dev`). Copy it.

## 3. Tell Convex about Clerk

In the **Convex dashboard** → your project → **Settings → Environment Variables**, add:

```
CLERK_JWT_ISSUER_DOMAIN = https://verb-noun-00.clerk.accounts.dev
```

(That's the Issuer URL from the previous step. `convex/auth.config.ts` reads it.)

Restart `bunx convex dev` if it was running, then reload `localhost:3000`. You should be able to
sign in, log a set, hit **Save**, and see it persist on refresh.

> **Dev vs production Convex URLs are different — that's correct.**
> - Local `.env.local` → **dev** deployment (e.g. `precise-eel-800.convex.cloud`)
> - Vercel production → **production** deployment (e.g. `knowing-badger-905.convex.cloud`)
> - Vercel sets `NEXT_PUBLIC_CONVEX_URL` automatically during `convex deploy` — don't add it manually on Vercel.
> - Set `CLERK_JWT_ISSUER_DOMAIN` on **both** dev and production Convex deployments in the Convex dashboard.

---

## 4. Deploy to Vercel

Two paths — pick one.

### Easiest: Convex's Vercel Marketplace integration
Install the **Convex** integration from the Vercel Marketplace and connect it to your project.
It auto-syncs the deploy keys and sets `NEXT_PUBLIC_CONVEX_URL` for you. Keep the "Custom Prefix"
field empty and enable Production (and Preview if you want).

### Manual
1. Push to GitHub, then import the repo at https://vercel.com/new.
2. **Convex dashboard → Production deployment (`knowing-badger-905`) → Settings → Generate Production Deploy Key.** Copy it.
3. In Vercel **Settings → Environment Variables** add:
   - `CONVEX_DEPLOY_KEY` = production deploy key → check **Production** only
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = your pk_... → check **Production** and **Preview**
   - `CLERK_SECRET_KEY` = your sk_... → check **Production** and **Preview**
   > You do **not** set `NEXT_PUBLIC_CONVEX_URL` manually — the deploy command sets it.
4. **If you deploy from a branch other than `main`** (e.g. `dev`), Vercel treats it as a **Preview** deploy. You also need:
   - Convex dashboard → **Project Settings → Generate Preview Deploy Key**
   - A second `CONVEX_DEPLOY_KEY` on Vercel scoped to **Preview** only (use the preview key, not the production key)
5. **Settings → Build & Deployment → Build Command**, override to:
   ```
   bunx convex deploy --cmd 'next build'
   ```
   This deploys your Convex functions, sets `NEXT_PUBLIC_CONVEX_URL`, then builds Next.
6. Put `CLERK_JWT_ISSUER_DOMAIN` into the **production** Convex deployment's env vars (already done if `bunx convex env list --prod` shows it).
7. Deploy from `main` for production, or ensure Preview keys are set for branch deploys.

> Gotcha: if a build ever fails with `convex/_generated` "module not found", it's the known
> ordering issue. Either keep the `--cmd 'next build'` form (recommended) or fall back to a build
> command of `bunx convex deploy && next build`.

### Vercel build failed?

Open the failed deployment → **Building** log and find the **first red error** above `exited with 1`.

| Error in log | Fix |
|---|---|
| `no Convex deployment configuration found` / missing `CONVEX_DEPLOY_KEY` | Add deploy key on Vercel for the **right environment** (Preview vs Production — see step 4 above) |
| `CLERK_JWT_ISSUER_DOMAIN ... not set` | Convex dashboard → **Production** → Environment Variables |
| `Can't resolve '../convex/_generated/api'` | Build command must be `bunx convex deploy --cmd 'next build'`, not `next build` alone |
| `@clerk/nextjs: Missing publishableKey` | Add Clerk keys on Vercel (Production + Preview) |

**Quick test:** merge/push to `main` and redeploy — production-scoped env vars only apply to production deploys, not preview deploys from the `dev` branch.

---

## Project structure

```
convex/
  schema.ts            # sessions table (per-user, indexed)
  auth.config.ts       # trusts Clerk's issuer
  sessions.ts          # listMine / save / remove (all scoped to the signed-in user)
app/
  layout.tsx           # ClerkProvider > ConvexClientProvider, fonts
  providers/ConvexClientProvider.tsx
  lib/plan.ts          # the A/B program + PF swaps + rules (static config)
  page.tsx             # auth gate + the tracker UI
  globals.css          # the ported design
middleware.ts          # clerkMiddleware
```

The exercise program lives in `app/lib/plan.ts` — edit sets/reps/swaps there. Only your logged
**sessions** go in the database.

---

## Roadmap (next features)
- PR chart per lift (line over time)
- CSV export of all sessions
- Weekly A/B/A → B/A/B schedule view
- Phase 2: 4-day Upper/Lower split once the beginner phase is locked in

## Version note
Package versions in `package.json` were current as of early 2026. If anything's drifted, run
`bun update`, or scaffold a fresh `bun create next-app` and drop the `app/`, `convex/`, and
`middleware.ts` files in.
# strong-tracker
# strong-tracker
# strong-tracker
