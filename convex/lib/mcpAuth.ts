import type { MutationCtx, QueryCtx } from "../_generated/server";
import { v } from "convex/values";

export const mcpAuthArg = v.union(
  v.object({
    kind: v.literal("pat"),
    token: v.string(),
  }),
  v.object({
    kind: v.literal("service"),
    secret: v.string(),
    userId: v.string(),
  }),
);

export type McpAuth =
  | { kind: "pat"; token: string }
  | { kind: "service"; secret: string; userId: string };

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function resolveMcpUser(
  ctx: QueryCtx | MutationCtx,
  auth: McpAuth,
): Promise<string> {
  if (auth.kind === "service") {
    const expected = process.env.MCP_SERVICE_SECRET;
    if (!expected || !safeEqual(auth.secret, expected)) {
      throw new Error("UNAUTHORIZED");
    }
    if (!auth.userId) throw new Error("UNAUTHORIZED");
    return auth.userId;
  }

  const tokenHash = await hashToken(auth.token);
  const row = await ctx.db
    .query("mcpTokens")
    .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();

  if (!row || row.revokedAt) throw new Error("UNAUTHORIZED");
  return row.userId;
}

export async function resolveMcpUserMutation(
  ctx: MutationCtx,
  auth: McpAuth,
): Promise<string> {
  if (auth.kind === "service") {
    return resolveMcpUser(ctx, auth);
  }

  const tokenHash = await hashToken(auth.token);
  const row = await ctx.db
    .query("mcpTokens")
    .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();

  if (!row || row.revokedAt) throw new Error("UNAUTHORIZED");
  await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
  return row.userId;
}
