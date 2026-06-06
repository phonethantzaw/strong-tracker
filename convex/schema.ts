import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One logged set: weight + reps (kept as strings so empty fields are allowed,
// and so "sec" values for planks fit the same shape).
const setEntry = v.object({
  weight: v.string(),
  reps: v.string(),
});

export default defineSchema({
  sessions: defineTable({
    userId: v.string(), // Clerk subject (identity.subject)
    date: v.string(), // YYYY-MM-DD
    day: v.union(v.literal("A"), v.literal("B")),
    mode: v.union(v.literal("std"), v.literal("pf")),
    // exerciseId -> array of sets
    entries: v.record(v.string(), v.array(setEntry)),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),
});
