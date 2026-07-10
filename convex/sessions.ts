import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const setEntry = v.object({ weight: v.string(), reps: v.string() });
const entriesArg = v.record(v.string(), v.array(setEntry));

// All sessions for the signed-in user, newest first.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Save (or overwrite) the session for a given date + workout day.
export const save = mutation({
  args: {
    date: v.string(),
    day: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
    mode: v.union(v.literal("std"), v.literal("pf")),
    entries: entriesArg,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sameDate = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", identity.subject).eq("date", args.date),
      )
      .collect();
    const existing = sameDate.find((s) => s.day === args.day);

    if (existing) {
      await ctx.db.patch(existing._id, {
        entries: args.entries,
        mode: args.mode,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("sessions", {
      userId: identity.subject,
      date: args.date,
      day: args.day,
      mode: args.mode,
      entries: args.entries,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.id);
  },
});
