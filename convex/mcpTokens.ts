import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashToken } from "./lib/mcpAuth";

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `strong_pat_${body}`;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return rows
      .filter((t) => !t.revokedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({
        _id: t._id,
        name: t.name,
        prefix: t.prefix,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
      }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Name required");

    const token = randomToken();
    const prefix = token.slice(0, 18);
    const id = await ctx.db.insert("mcpTokens", {
      userId: identity.subject,
      name,
      tokenHash: await hashToken(token),
      prefix,
      createdAt: Date.now(),
    });
    return { id, token, prefix, name };
  },
});

export const revoke = mutation({
  args: { id: v.id("mcpTokens") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== identity.subject) throw new Error("Not found");
    await ctx.db.patch(args.id, { revokedAt: Date.now() });
  },
});

export const resolvePat = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token.startsWith("strong_pat_")) return null;
    const tokenHash = await hashToken(args.token);
    const row = await ctx.db
      .query("mcpTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!row || row.revokedAt) return null;
    return { userId: row.userId };
  },
});
