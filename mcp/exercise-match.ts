import { PLAN, type Day } from "@/app/lib/plan";
import type { SessionView } from "./types";

export type ExerciseMatch = {
  id: string;
  name: string;
  day?: Day;
  equipment?: string;
  source: "plan" | "custom" | "session";
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function score(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 80;
  if (c.includes(q) || q.includes(c)) return 60;
  const qTokens = q.split(" ");
  const cTokens = new Set(c.split(" "));
  const overlap = qTokens.filter((t) => cTokens.has(t)).length;
  if (overlap === 0) return 0;
  return 20 + (overlap / qTokens.length) * 40;
}

export function catalogForDay(
  day: Day,
  session?: SessionView | null,
): ExerciseMatch[] {
  const plan = PLAN[day].ex.map((e) => ({
    id: e.id,
    name: e.name,
    day,
    equipment: e.pf,
    source: "plan" as const,
  }));
  const custom =
    session?.customExercises?.map((e) => ({
      id: e.id,
      name: e.name,
      day,
      equipment: e.equipment,
      source: "custom" as const,
    })) ?? [];
  return [...plan, ...custom];
}

export function allPlanExercises(): ExerciseMatch[] {
  return (Object.keys(PLAN) as Day[]).flatMap((day) =>
    PLAN[day].ex.map((e) => ({
      id: e.id,
      name: e.name,
      day,
      equipment: e.pf,
      source: "plan" as const,
    })),
  );
}

export type MatchResult =
  | { ok: true; match: ExerciseMatch }
  | { ok: false; code: "NOT_FOUND" | "AMBIGUOUS_EXERCISE"; candidates: ExerciseMatch[] };

export function resolveExercise(
  query: string,
  opts?: { day?: Day; session?: SessionView | null },
): MatchResult {
  const pool = opts?.day
    ? catalogForDay(opts.day, opts.session)
    : [
        ...allPlanExercises(),
        ...(opts?.session?.customExercises?.map((e) => ({
          id: e.id,
          name: e.name,
          equipment: e.equipment,
          source: "custom" as const,
        })) ?? []),
      ];

  const byId = pool.find((e) => e.id === query);
  if (byId) return { ok: true, match: byId };

  const ranked = pool
    .map((e) => ({
      e,
      s: Math.max(score(query, e.name), score(query, e.equipment ?? ""), score(query, e.id)),
    }))
    .filter((x) => x.s >= 40)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) {
    return { ok: false, code: "NOT_FOUND", candidates: pool.slice(0, 8) };
  }
  if (ranked.length > 1 && ranked[0].s - ranked[1].s < 15 && ranked[1].s >= 50) {
    return {
      ok: false,
      code: "AMBIGUOUS_EXERCISE",
      candidates: ranked.slice(0, 5).map((x) => x.e),
    };
  }
  return { ok: true, match: ranked[0].e };
}
