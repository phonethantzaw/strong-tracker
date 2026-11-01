import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mcpAuthArg,
  resolveMcpUser,
  resolveMcpUserMutation,
  type McpAuth,
} from "./lib/mcpAuth";
import { rateLimiter } from "./rateLimit";

const dayArg = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
  v.literal("D"),
);

function localDateInZone(ms: number): string {
  const timeZone = process.env.STRONG_TIMEZONE ?? "America/Chicago";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

const unitArg = v.union(v.literal("lb"), v.literal("kg"));

function kgToLb(kg: number): number {
  return Math.round(kg * 2.2046226218 * 100) / 100;
}

function toStoredWeight(weight: number, unit: "lb" | "kg"): string {
  const lbs = unit === "kg" ? kgToLb(weight) : weight;
  return String(lbs);
}

async function assertWriteLimit(ctx: Parameters<typeof rateLimiter.limit>[0], userId: string) {
  const status = await rateLimiter.limit(ctx, "mcpWrite", { key: userId });
  if (!status.ok) throw new Error("RATE_LIMITED");
}

async function assertReadLimit(ctx: Parameters<typeof rateLimiter.limit>[0], userId: string) {
  const status = await rateLimiter.limit(ctx, "mcpRead", { key: userId });
  if (!status.ok) throw new Error("RATE_LIMITED");
}

async function getOwnedSession(
  ctx: { db: { get: (id: Id<"sessions">) => Promise<Doc<"sessions"> | null> } },
  userId: string,
  sessionId: Id<"sessions">,
) {
  const row = await ctx.db.get(sessionId);
  if (!row || row.userId !== userId) throw new Error("NOT_FOUND");
  return row;
}

function sessionSummary(session: Doc<"sessions">) {
  return {
    id: session._id,
    date: session.date,
    day: session.day,
    mode: session.mode,
    status: session.status ?? "completed",
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    entries: session.entries,
    exerciseOrder: session.exerciseOrder ?? Object.keys(session.entries),
    customExercises: session.customExercises ?? [],
    createdAt: session.createdAt,
  };
}

export const consumeReadLimit = mutation({
  args: { auth: mcpAuthArg },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertReadLimit(ctx, userId);
    return { ok: true as const };
  },
});

export const getActive = query({
  args: { auth: mcpAuthArg },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUser(ctx, args.auth as McpAuth);
    const active = await ctx.db
      .query("sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .take(5);
    const session = active[0] ?? null;
    return session ? sessionSummary(session) : null;
  },
});

export const getSession = query({
  args: { auth: mcpAuthArg, sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUser(ctx, args.auth as McpAuth);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    return sessionSummary(session);
  },
});

export const listSessions = query({
  args: {
    auth: mcpAuthArg,
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    day: v.optional(dayArg),
    status: v.optional(
      v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUser(ctx, args.auth as McpAuth);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);

    return rows
      .filter((s) => {
        if (s.status === "cancelled" && args.status !== "cancelled") return false;
        if (args.day && s.day !== args.day) return false;
        if (args.status) {
          const status = s.status ?? "completed";
          if (status !== args.status) return false;
        }
        if (args.from && s.date < args.from) return false;
        if (args.to && s.date > args.to) return false;
        return true;
      })
      .slice(0, limit)
      .map(sessionSummary);
  },
});

export const startWorkout = mutation({
  args: {
    auth: mcpAuthArg,
    day: dayArg,
    mode: v.optional(v.union(v.literal("std"), v.literal("pf"))),
    date: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    exerciseIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);

    const existingActive = await ctx.db
      .query("sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .take(1);

    if (existingActive[0]) {
      return {
        ok: false as const,
        code: "ACTIVE_EXISTS" as const,
        active: sessionSummary(existingActive[0]),
      };
    }

    const now = Date.now();
    const date = args.date ?? localDateInZone(args.startedAt ?? now);

    const id = await ctx.db.insert("sessions", {
      userId,
      date,
      day: args.day,
      mode: args.mode ?? "pf",
      entries: {},
      createdAt: now,
      status: "active",
      startedAt: args.startedAt ?? now,
      exerciseOrder: args.exerciseIds ?? [],
      customExercises: [],
    });

    const session = await ctx.db.get(id);
    return { ok: true as const, session: sessionSummary(session!) };
  },
});

export const logSet = mutation({
  args: {
    auth: mcpAuthArg,
    sessionId: v.id("sessions"),
    exerciseId: v.string(),
    weight: v.number(),
    reps: v.number(),
    setNumber: v.number(),
    unit: v.optional(unitArg),
    equipment: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    if (session.status !== "active") throw new Error("NOT_ACTIVE");

    const setNumber = Math.floor(args.setNumber);
    if (setNumber < 1) throw new Error("INVALID_SET");

    const unit = args.unit ?? "lb";
    const sets = [...(session.entries[args.exerciseId] ?? [])];
    const idx = setNumber - 1;
    if (sets[idx] && (sets[idx].weight || sets[idx].reps)) {
      throw new Error("SET_EXISTS");
    }

    while (sets.length < setNumber) {
      sets.push({ weight: "", reps: "" });
    }
    sets[idx] = {
      weight: toStoredWeight(args.weight, unit),
      reps: String(args.reps),
      equipment: args.equipment,
      notes: args.notes,
      loggedAt: Date.now(),
      inputUnit: unit,
    };

    const entries = { ...session.entries, [args.exerciseId]: sets };
    const order = session.exerciseOrder ?? [];
    const exerciseOrder = order.includes(args.exerciseId)
      ? order
      : [...order, args.exerciseId];

    await ctx.db.patch(session._id, { entries, exerciseOrder, createdAt: Date.now() });
    const updated = await ctx.db.get(session._id);
    return { ok: true as const, session: sessionSummary(updated!), setNumber };
  },
});

export const updateSet = mutation({
  args: {
    auth: mcpAuthArg,
    sessionId: v.id("sessions"),
    exerciseId: v.string(),
    setNumber: v.number(),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    unit: v.optional(unitArg),
    equipment: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    if (session.status !== "active") throw new Error("NOT_ACTIVE");

    const setNumber = Math.floor(args.setNumber);
    const sets = [...(session.entries[args.exerciseId] ?? [])];
    const idx = setNumber - 1;
    if (!sets[idx]) throw new Error("NOT_FOUND");

    const unit = args.unit ?? sets[idx].inputUnit ?? "lb";
    sets[idx] = {
      ...sets[idx],
      weight:
        args.weight !== undefined
          ? toStoredWeight(args.weight, unit)
          : sets[idx].weight,
      reps: args.reps !== undefined ? String(args.reps) : sets[idx].reps,
      equipment: args.equipment ?? sets[idx].equipment,
      notes: args.notes ?? sets[idx].notes,
      inputUnit: args.unit ?? sets[idx].inputUnit,
      loggedAt: Date.now(),
    };

    await ctx.db.patch(session._id, {
      entries: { ...session.entries, [args.exerciseId]: sets },
      createdAt: Date.now(),
    });
    const updated = await ctx.db.get(session._id);
    return { ok: true as const, session: sessionSummary(updated!) };
  },
});

export const addExercise = mutation({
  args: {
    auth: mcpAuthArg,
    sessionId: v.id("sessions"),
    name: v.string(),
    exerciseId: v.optional(v.string()),
    equipment: v.optional(v.string()),
    targetSets: v.optional(v.number()),
    targetReps: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    if (session.status !== "active") throw new Error("NOT_ACTIVE");

    const id =
      args.exerciseId ??
      `custom_${args.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40)}_${Date.now().toString(36)}`;

    const custom = [
      ...(session.customExercises ?? []),
      {
        id,
        name: args.name.trim(),
        equipment: args.equipment,
        targetSets: args.targetSets,
        targetReps: args.targetReps,
        notes: args.notes,
      },
    ];
    const order = session.exerciseOrder ?? Object.keys(session.entries);
    const exerciseOrder = order.includes(id) ? order : [...order, id];
    const entries = {
      ...session.entries,
      [id]: session.entries[id] ?? [],
    };

    await ctx.db.patch(session._id, {
      customExercises: custom,
      exerciseOrder,
      entries,
      createdAt: Date.now(),
    });
    const updated = await ctx.db.get(session._id);
    return { ok: true as const, exerciseId: id, session: sessionSummary(updated!) };
  },
});

export const completeWorkout = mutation({
  args: {
    auth: mcpAuthArg,
    sessionId: v.id("sessions"),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) throw new Error("NEEDS_CONFIRMATION");
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    if (session.status !== "active") throw new Error("NOT_ACTIVE");

    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: now,
      createdAt: now,
    });
    const updated = await ctx.db.get(session._id);
    return { ok: true as const, session: sessionSummary(updated!) };
  },
});

export const cancelWorkout = mutation({
  args: {
    auth: mcpAuthArg,
    sessionId: v.id("sessions"),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) throw new Error("NEEDS_CONFIRMATION");
    const userId = await resolveMcpUserMutation(ctx, args.auth as McpAuth);
    await assertWriteLimit(ctx, userId);
    const session = await getOwnedSession(ctx, userId, args.sessionId);
    if (session.status !== "active") throw new Error("NOT_ACTIVE");

    await ctx.db.patch(session._id, {
      status: "cancelled",
      completedAt: Date.now(),
    });
    return { ok: true as const, sessionId: session._id };
  },
});
