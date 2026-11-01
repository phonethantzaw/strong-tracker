import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const setEntry = v.object({
  weight: v.string(),
  reps: v.string(),
  equipment: v.optional(v.string()),
  notes: v.optional(v.string()),
  loggedAt: v.optional(v.number()),
  inputUnit: v.optional(v.union(v.literal("lb"), v.literal("kg"))),
});
const entriesArg = v.record(v.string(), v.array(setEntry));

type SetRow = {
  weight: string;
  reps: string;
  equipment?: string;
  notes?: string;
  loggedAt?: number;
  inputUnit?: "lb" | "kg";
};

function mergeSets(existing: SetRow[] | undefined, incoming: SetRow[]): SetRow[] {
  const max = Math.max(existing?.length ?? 0, incoming.length);
  const out: SetRow[] = [];
  for (let i = 0; i < max; i++) {
    const prev = existing?.[i];
    const next = incoming[i];
    if (!next) {
      if (prev) out.push(prev);
      continue;
    }
    out.push({
      weight: next.weight,
      reps: next.reps,
      equipment: next.equipment ?? prev?.equipment,
      notes: next.notes ?? prev?.notes,
      loggedAt: next.loggedAt ?? prev?.loggedAt,
      inputUnit: next.inputUnit ?? prev?.inputUnit,
    });
  }
  return out;
}

function mergeEntries(
  existing: Record<string, SetRow[]> | undefined,
  incoming: Record<string, SetRow[]>,
): Record<string, SetRow[]> {
  const merged: Record<string, SetRow[]> = { ...(existing ?? {}) };
  for (const [exId, sets] of Object.entries(incoming)) {
    merged[exId] = mergeSets(existing?.[exId], sets);
  }
  return merged;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return rows
      .filter((s) => s.status !== "cancelled")
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

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
    const existing = sameDate.find(
      (s) => s.day === args.day && s.status !== "cancelled",
    );

    if (existing) {
      const merged = mergeEntries(existing.entries, args.entries);
      await ctx.db.patch(existing._id, {
        entries: merged,
        mode: args.mode,
        createdAt: Date.now(),
        status: existing.status ?? "completed",
        customExercises: existing.customExercises,
        exerciseOrder: existing.exerciseOrder,
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
      status: "completed",
      completedAt: Date.now(),
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
