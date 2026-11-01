# STRONG MCP Setup

Use the STRONG MCP server so AI agents (Grok, Muse Code, Claude, Cursor) can log and analyze workouts against your Convex data without opening the web app.

## Local setup (Bun)

1. Install dependencies:

```bash
bun install
```

2. Run Convex locally / link your deployment:

```bash
bun run dev:convex
```

3. Set Convex env vars (dashboard or CLI):

```bash
bunx convex env set MCP_SERVICE_SECRET "$(openssl rand -hex 32)"
bunx convex env set STRONG_TIMEZONE "America/Chicago"
```

4. Set the same `MCP_SERVICE_SECRET` in Vercel / `.env.local` for the Next.js API route.

5. Create a personal access token in the app: **MCP Access** (`/settings/mcp`).

6. Export env for stdio:

```bash
export NEXT_PUBLIC_CONVEX_URL="https://YOUR_DEPLOYMENT.convex.cloud"
export STRONG_MCP_TOKEN="strong_pat_..."
bun run mcp:stdio
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Next.js / stdio | Convex deployment URL |
| `CONVEX_URL` | stdio (optional alias) | Same as above |
| `STRONG_MCP_TOKEN` | stdio | Personal access token (`strong_pat_…`) |
| `STRONG_APP_URL` | Vercel / MCP server (optional) | Public app URL used to add "Open in STRONG" links to video results |
| `MCP_SERVICE_SECRET` | Vercel + Convex | Shared secret for Clerk OAuth → Convex bridge |
| `STRONG_TIMEZONE` | Convex (+ optional Next) | Local `YYYY-MM-DD` for new sessions (default `America/Chicago`) |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Existing Clerk JWT issuer for the web app |
| Clerk keys | Next.js | Existing Clerk app keys |

## Authentication

### Personal access tokens (PAT)

- Create/revoke at `/settings/mcp`.
- Sent as `Authorization: Bearer strong_pat_…`.
- Convex resolves the token hash → `userId`. Tool args never accept a `userId`.

### Clerk OAuth (remote MCP clients)

1. In Clerk Dashboard → **OAuth applications** → Settings:
   - Enable **Publish CIMD support** (preferred) and/or **Publish DCR support** if a client needs Dynamic Client Registration.
   - Set default scopes to include `profile` and `email`.
2. Deploy the Next.js app so these routes are public:
   - `https://YOUR_DOMAIN/api/mcp`
   - `https://YOUR_DOMAIN/.well-known/oauth-protected-resource/api/mcp`
   - `https://YOUR_DOMAIN/.well-known/oauth-authorization-server`
3. Connect an MCP client to `https://YOUR_DOMAIN/api/mcp`. The client completes Clerk OAuth; the server verifies the token and scopes Convex calls to that Clerk user via `MCP_SERVICE_SECRET`.

## Connect Grok (xAI API)

Use a remote MCP tool with a PAT:

```json
{
  "tools": [
    {
      "type": "mcp",
      "server_url": "https://YOUR_DOMAIN/api/mcp",
      "server_label": "strong-tracker",
      "headers": {
        "Authorization": "Bearer strong_pat_YOUR_TOKEN"
      }
    }
  ]
}
```

Exact xAI request field names can vary by API version; the important parts are the Streamable HTTP MCP URL and the Bearer PAT. Consumer Grok app connectors depend on xAI shipping MCP support for that surface.

## Connect Muse Code

Muse Code’s config format may change. Use one of:

**Stdio (local):**

```json
{
  "mcpServers": {
    "strong-tracker": {
      "command": "bun",
      "args": ["mcp/stdio.ts"],
      "cwd": "/absolute/path/to/workout-app",
      "env": {
        "NEXT_PUBLIC_CONVEX_URL": "https://YOUR_DEPLOYMENT.convex.cloud",
        "STRONG_MCP_TOKEN": "strong_pat_..."
      }
    }
  }
}
```

**Remote URL:**

```json
{
  "mcpServers": {
    "strong-tracker": {
      "url": "https://YOUR_DOMAIN/api/mcp",
      "headers": {
        "Authorization": "Bearer strong_pat_..."
      }
    }
  }
}
```

If Muse exposes a native MCP settings UI, paste the same URL + header or stdio command there.

## Cursor / Claude Desktop (stdio example)

```json
{
  "mcpServers": {
    "strong-tracker": {
      "command": "bun",
      "args": ["/absolute/path/to/workout-app/mcp/stdio.ts"],
      "env": {
        "NEXT_PUBLIC_CONVEX_URL": "https://YOUR_DEPLOYMENT.convex.cloud",
        "STRONG_MCP_TOKEN": "strong_pat_..."
      }
    }
  }
}
```

## Example conversations

**Start**

> Let’s do Workout A today.

Agent calls `get_workout_plan` (with previous sets) → `start_workout`.

**Log**

> Bench press, 135 pounds, 10 reps.

Agent calls `log_exercise_set` and confirms the save.

**Complete**

> I’m done with Workout A.

Agent summarizes, asks for confirmation, then `complete_workout` with `confirm: true`.

**Resume**

> Continue my workout from yesterday.

Agent calls `get_active_workout`.

**Progress**

> How did this week go vs last week?

Agent calls `get_weekly_report` / `get_training_status`.

**Videos**

> Show me the bench press video.
> Share the warm-up video.

Agent calls `get_workout_videos` and shares the returned links.

## MCP tools

Writes: `start_workout`, `get_active_workout`, `log_exercise_set`, `update_exercise_set`, `add_exercise_to_workout`, `complete_workout`, `cancel_workout`

Reads: `get_workout_plan`, `get_next_workout`, `get_workout_history`, `get_exercise_progress`, `get_personal_records`, `get_weekly_report`, `get_training_status`, `compare_workouts`, `get_workout_videos`

## Deployment (Vercel)

1. Deploy the Next.js app as usual (`bun run build` / Vercel Git integration).
2. Set `MCP_SERVICE_SECRET` and `STRONG_TIMEZONE` on Vercel.
3. Set `MCP_SERVICE_SECRET` (and optionally `STRONG_TIMEZONE`) on the Convex deployment.
4. Confirm `/api/mcp` responds (unauthorized without a token) and `.well-known` metadata is reachable.
5. Create a PAT in production and test with a client.

Vercel serverless works with Streamable HTTP via `mcp-handler`. Keep `runtime = "nodejs"` on the MCP route.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `UNAUTHORIZED` | Regenerate PAT; ensure Bearer header; for OAuth check Clerk CIMD/DCR and secrets |
| `ACTIVE_EXISTS` | Call `get_active_workout`, then continue, complete, or cancel |
| `SET_EXISTS` | Use `update_exercise_set` for that set number |
| `RATE_LIMITED` | Wait ~1 minute; limits are ~60 writes / 120 reads per user per minute |
| Wrong calendar date | Set `STRONG_TIMEZONE` to your local zone |
| Web app missing MCP sets | Refresh; both use the same `sessions` table |
| OAuth metadata 404 | Ensure `.well-known` routes are deployed and not blocked by auth middleware |

## Security notes

- Never put Clerk secret keys, Convex deploy keys, or `MCP_SERVICE_SECRET` in client-side code or MCP tool arguments.
- Never pass a `userId` into tools; identity always comes from verified auth.
- Revoke PATs immediately if leaked.
