import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

type Day = "A" | "B" | "C" | "D";
type Mode = "std" | "pf";
type SetRow = { weight: string; reps: string; notes?: string; inputUnit?: "lb" | "kg" };

const DAYS: Day[] = ["A", "B", "C", "D"];
const MS_DAY = 86_400_000;
const SEED_NOTE = "seed-sample";

const TEMPLATES: Record<Day, { mode: Mode; entries: Record<string, SetRow[]> }> = {
  A: {
    mode: "pf",
    entries: {
      a_bench: sets("135", "10"),
      a_incline: sets("55", "10"),
      a_fly: sets("60", "8"),
      a_tri_push: sets("60", "8"),
      a_tri_oh: sets("55", "8"),
    },
  },
  B: {
    mode: "pf",
    entries: {
      b_dl: sets("185", "8"),
      b_pullup: sets("", "8"),
      b_row: sets("115", "10"),
      b_curl: sets("35", "12"),
      b_hammer: sets("30", "12"),
    },
  },
  C: {
    mode: "std",
    entries: {
      c_ohp: sets("50", "10"),
      c_lat_raise: sets("20", "12"),
      c_front_raise: sets("20", "12"),
      c_twist: sets("", "20"),
      c_plank: sets("", "45"),
    },
  },
  D: {
    mode: "pf",
    entries: {
      d_squat: sets("185", "8"),
      d_lunge: sets("40", "10"),
      d_leg_press: sets("270", "12"),
      d_leg_ext: sets("90", "15"),
      d_leg_curl: sets("80", "15"),
      d_calf: sets("180", "15"),
    },
  },
};

function sets(weight: string, reps: string, count = 3): SetRow[] {
  return Array.from({ length: count }, () => ({
    weight,
    reps,
    notes: SEED_NOTE,
    inputUnit: "lb" as const,
  }));
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildSchedule(now = new Date()) {
  const offsets = [1, 3, 5, 8, 10, 12, 13];
  return offsets.map((daysAgo, i) => {
    const d = new Date(now.getTime() - daysAgo * MS_DAY);
    d.setHours(12, 0, 0, 0);
    const day = DAYS[i % DAYS.length];
    const template = TEMPLATES[day];
    const bump = Math.floor(i / DAYS.length);
    const entries: Record<string, SetRow[]> = {};
    for (const [exId, rows] of Object.entries(template.entries)) {
      entries[exId] = rows.map((row) => {
        const base = Number.parseFloat(row.weight);
        const weight =
          Number.isFinite(base) && base > 0
            ? String(Math.max(5, base - bump * 5))
            : row.weight;
        return { ...row, weight };
      });
    }
    return {
      date: dateKey(d),
      day,
      mode: template.mode,
      entries,
      createdAt: d.getTime(),
    };
  });
}

function isSeedSession(entries: Record<string, Array<{ notes?: string }>>) {
  return Object.values(entries).some((rows) => rows.some((s) => s.notes === SEED_NOTE));
}

async function seedForUser(ctx: MutationCtx, userId: string) {
  const existing = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let removed = 0;
  for (const row of existing) {
    if (isSeedSession(row.entries)) {
      await ctx.db.delete(row._id);
      removed += 1;
    }
  }

  const occupied = new Set(
    existing
      .filter((row) => !isSeedSession(row.entries) && row.status !== "cancelled")
      .map((row) => row.date),
  );

  let inserted = 0;
  for (const session of buildSchedule()) {
    if (occupied.has(session.date)) continue;
    await ctx.db.insert("sessions", {
      userId,
      date: session.date,
      day: session.day,
      mode: session.mode,
      entries: session.entries,
      createdAt: session.createdAt,
      completedAt: session.createdAt + 45 * 60 * 1000,
      startedAt: session.createdAt,
      status: "completed",
      exerciseOrder: Object.keys(session.entries),
      customExercises: [],
    });
    inserted += 1;
  }

  return { removed, inserted, userId };
}

export const sampleHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return seedForUser(ctx, identity.subject);
  },
});

export const sampleHistoryForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => seedForUser(ctx, args.userId),
});
