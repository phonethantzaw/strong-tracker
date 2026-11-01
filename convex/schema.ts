import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const setEntry = v.object({
  weight: v.string(),
  reps: v.string(),
  equipment: v.optional(v.string()),
  notes: v.optional(v.string()),
  loggedAt: v.optional(v.number()),
  inputUnit: v.optional(v.union(v.literal("lb"), v.literal("kg"))),
});

const customExercise = v.object({
  id: v.string(),
  name: v.string(),
  equipment: v.optional(v.string()),
  targetSets: v.optional(v.number()),
  targetReps: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export default defineSchema({
  sessions: defineTable({
    userId: v.string(),
    date: v.string(),
    day: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
    mode: v.union(v.literal("std"), v.literal("pf")),
    entries: v.record(v.string(), v.array(setEntry)),
    createdAt: v.number(),
    status: v.optional(
      v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    exerciseOrder: v.optional(v.array(v.string())),
    customExercises: v.optional(v.array(customExercise)),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"]),

  mcpTokens: defineTable({
    userId: v.string(),
    name: v.string(),
    tokenHash: v.string(),
    prefix: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["tokenHash"])
    .index("by_user", ["userId"]),
});
