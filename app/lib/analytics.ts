import type { Doc } from "@/convex/_generated/dataModel";
import { DAYS, PLAN, PROGRAM, type Day } from "./plan";
import {
  currentStreak,
  parseNum,
  sessionLiftCount,
  sessionVolume,
  setVolume,
  suggestNextWorkout,
  type SetEntry,
} from "./stats";

export type Session = Doc<"sessions">;
export type WeightUnit = "lb" | "kg";

const LB_PER_KG = 2.2046226218;

export function toDisplayWeight(lbs: number, unit: WeightUnit): number {
  if (unit === "kg") return Math.round((lbs / LB_PER_KG) * 100) / 100;
  return lbs;
}

export function fromInputWeight(weight: number, unit: WeightUnit): number {
  if (unit === "kg") return Math.round(weight * LB_PER_KG * 100) / 100;
  return weight;
}

/** Epley estimated 1RM. */
export function estimated1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0) return 0;
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

export function isCountableSession(session: Session): boolean {
  return session.status !== "cancelled" && session.status !== "active";
}

export function completedSessions(sessions: Session[]): Session[] {
  return sessions.filter(isCountableSession);
}

export function getExerciseName(
  exerciseId: string,
  sessions: Session[] = [],
): string {
  for (const day of Object.keys(PLAN) as Day[]) {
    const match = PLAN[day].ex.find((e) => e.id === exerciseId);
    if (match) return match.name;
  }
  for (const session of sessions) {
    const custom = session.customExercises?.find((e) => e.id === exerciseId);
    if (custom) return custom.name;
  }
  return exerciseId;
}

export type ExerciseProgressPoint = {
  date: string;
  sessionId: string;
  day: Day;
  sets: Array<{ weight: number; reps: number; volume: number; e1rm: number }>;
  bestWeight: number;
  bestE1rm: number;
  volume: number;
};

export function exerciseProgress(
  sessions: Session[],
  exerciseId: string,
  unit: WeightUnit = "lb",
): ExerciseProgressPoint[] {
  const points: ExerciseProgressPoint[] = [];
  for (const session of completedSessions(sessions)) {
    const sets = session.entries[exerciseId];
    if (!sets?.length) continue;
    const parsed = sets
      .map((s) => {
        const weight = toDisplayWeight(parseNum(s.weight), unit);
        const reps = parseNum(s.reps);
        return {
          weight,
          reps,
          volume: weight * reps || reps,
          e1rm: estimated1RM(weight, reps),
        };
      })
      .filter((s) => s.weight || s.reps);
    if (!parsed.length) continue;
    points.push({
      date: session.date,
      sessionId: session._id,
      day: session.day,
      sets: parsed,
      bestWeight: Math.max(...parsed.map((s) => s.weight)),
      bestE1rm: Math.max(...parsed.map((s) => s.e1rm)),
      volume: parsed.reduce((sum, s) => sum + s.volume, 0),
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
  sessionId: string;
  score: number;
};

export function personalRecords(
  sessions: Session[],
  unit: WeightUnit = "lb",
): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const session of completedSessions(sessions)) {
    for (const [exerciseId, sets] of Object.entries(session.entries)) {
      for (const set of sets) {
        const weightLbs = parseNum(set.weight);
        const reps = parseNum(set.reps);
        if (!weightLbs && !reps) continue;
        const weight = toDisplayWeight(weightLbs, unit);
        const e1rm = estimated1RM(weight, reps);
        const score = weight ? weight * Math.max(reps, 1) : reps;
        const current = best.get(exerciseId);
        if (!current || score > current.score) {
          best.set(exerciseId, {
            exerciseId,
            exerciseName: getExerciseName(exerciseId, sessions),
            weight,
            reps,
            e1rm,
            date: session.date,
            sessionId: session._id,
            score,
          });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekRange(weekStart: Date): { from: string; to: string } {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return { from: dateKey(weekStart), to: dateKey(end) };
}

function sessionsInRange(sessions: Session[], from: string, to: string) {
  return completedSessions(sessions).filter((s) => s.date >= from && s.date <= to);
}

export type WeeklyReport = {
  from: string;
  to: string;
  workoutsCompleted: number;
  distribution: Record<Day, number>;
  totalSets: number;
  totalVolume: number;
  personalRecords: PersonalRecord[];
  progression: Array<{
    exerciseId: string;
    exerciseName: string;
    trend: "improving" | "stagnating" | "declining" | "new";
    deltaE1rm: number;
  }>;
  missedWorkouts: number;
  previousWeek: {
    from: string;
    to: string;
    workoutsCompleted: number;
    totalVolume: number;
  };
  comparison: {
    workoutsDelta: number;
    volumeDelta: number;
  };
};

function countSets(session: Session): number {
  return Object.values(session.entries).reduce(
    (sum, sets) => sum + sets.filter((s) => s.weight || s.reps).length,
    0,
  );
}

function progressionForWeek(
  sessions: Session[],
  weekSessions: Session[],
  unit: WeightUnit,
) {
  const ids = new Set<string>();
  for (const s of weekSessions) {
    for (const [id, sets] of Object.entries(s.entries)) {
      if (sets.some((x) => x.weight || x.reps)) ids.add(id);
    }
  }
  const out: WeeklyReport["progression"] = [];
  for (const exerciseId of ids) {
    const history = exerciseProgress(sessions, exerciseId, unit);
    const inWeek = history.filter((p) =>
      weekSessions.some((s) => s._id === p.sessionId),
    );
    const before = history.filter(
      (p) => !weekSessions.some((s) => s._id === p.sessionId),
    );
    if (!inWeek.length) continue;
    const latest = inWeek[inWeek.length - 1];
    const prior = before[before.length - 1];
    if (!prior) {
      out.push({
        exerciseId,
        exerciseName: getExerciseName(exerciseId, sessions),
        trend: "new",
        deltaE1rm: 0,
      });
      continue;
    }
    const delta = latest.bestE1rm - prior.bestE1rm;
    out.push({
      exerciseId,
      exerciseName: getExerciseName(exerciseId, sessions),
      trend: delta > 0.5 ? "improving" : delta < -0.5 ? "declining" : "stagnating",
      deltaE1rm: Math.round(delta * 100) / 100,
    });
  }
  return out;
}

export function weeklyReport(
  sessions: Session[],
  weekOf: Date = new Date(),
  unit: WeightUnit = "lb",
): WeeklyReport {
  const weekStart = startOfWeek(weekOf);
  const { from, to } = weekRange(weekStart);
  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prev = weekRange(prevStart);

  const weekSessions = sessionsInRange(sessions, from, to);
  const prevSessions = sessionsInRange(sessions, prev.from, prev.to);

  const distribution = Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<
    Day,
    number
  >;
  let totalSets = 0;
  let totalVolumeLbs = 0;
  for (const s of weekSessions) {
    distribution[s.day] += 1;
    totalSets += countSets(s);
    totalVolumeLbs += sessionVolume(s);
  }

  const prsThisWeek = personalRecords(sessions, unit).filter(
    (pr) => pr.date >= from && pr.date <= to,
  );

  const prevVolume = prevSessions.reduce((sum, s) => sum + sessionVolume(s), 0);
  const volume =
    unit === "kg"
      ? Math.round((totalVolumeLbs / LB_PER_KG) * 100) / 100
      : totalVolumeLbs;
  const prevVolumeDisplay =
    unit === "kg"
      ? Math.round((prevVolume / LB_PER_KG) * 100) / 100
      : prevVolume;

  return {
    from,
    to,
    workoutsCompleted: weekSessions.length,
    distribution,
    totalSets,
    totalVolume: volume,
    personalRecords: prsThisWeek,
    progression: progressionForWeek(sessions, weekSessions, unit),
    missedWorkouts: Math.max(0, PROGRAM.targetPerWeek - weekSessions.length),
    previousWeek: {
      from: prev.from,
      to: prev.to,
      workoutsCompleted: prevSessions.length,
      totalVolume: prevVolumeDisplay,
    },
    comparison: {
      workoutsDelta: weekSessions.length - prevSessions.length,
      volumeDelta: Math.round((volume - prevVolumeDisplay) * 100) / 100,
    },
  };
}

export type TrainingStatus = {
  mostRecent: {
    id: string;
    date: string;
    day: Day;
    volume: number;
    lifts: number;
  } | null;
  currentStreak: number;
  workoutsThisMonth: number;
  consistency: {
    last14Days: number;
    targetPerWeek: number;
  };
  improving: string[];
  stagnating: string[];
  nextWorkout: Day;
};

export function trainingStatus(
  sessions: Session[],
  now = new Date(),
  unit: WeightUnit = "lb",
): TrainingStatus {
  const done = completedSessions(sessions).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const monthKey = dateKey(now).slice(0, 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  const from14 = dateKey(twoWeeksAgo);

  const report = weeklyReport(sessions, now, unit);
  const improving = report.progression
    .filter((p) => p.trend === "improving")
    .map((p) => p.exerciseName);
  const stagnating = report.progression
    .filter((p) => p.trend === "stagnating" || p.trend === "declining")
    .map((p) => p.exerciseName);

  const latest = done[0];
  return {
    mostRecent: latest
      ? {
          id: latest._id,
          date: latest.date,
          day: latest.day,
          volume:
            unit === "kg"
              ? Math.round((sessionVolume(latest) / LB_PER_KG) * 100) / 100
              : sessionVolume(latest),
          lifts: sessionLiftCount(latest),
        }
      : null,
    currentStreak: currentStreak(done),
    workoutsThisMonth: done.filter((s) => s.date.startsWith(monthKey)).length,
    consistency: {
      last14Days: done.filter((s) => s.date >= from14).length,
      targetPerWeek: PROGRAM.targetPerWeek,
    },
    improving,
    stagnating,
    nextWorkout: suggestNextWorkout(done),
  };
}

export type CompareResult = {
  left: {
    label: string;
    workouts: number;
    totalSets: number;
    totalVolume: number;
    days: Record<Day, number>;
  };
  right: {
    label: string;
    workouts: number;
    totalSets: number;
    totalVolume: number;
    days: Record<Day, number>;
  };
  volumeDelta: number;
  workoutsDelta: number;
};

function summarizeGroup(
  label: string,
  sessions: Session[],
  unit: WeightUnit,
): CompareResult["left"] {
  const days = Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<Day, number>;
  let totalSets = 0;
  let totalVolumeLbs = 0;
  for (const s of sessions) {
    days[s.day] += 1;
    totalSets += countSets(s);
    totalVolumeLbs += sessionVolume(s);
  }
  return {
    label,
    workouts: sessions.length,
    totalSets,
    totalVolume:
      unit === "kg"
        ? Math.round((totalVolumeLbs / LB_PER_KG) * 100) / 100
        : totalVolumeLbs,
    days,
  };
}

export function compareDateRanges(
  sessions: Session[],
  left: { from: string; to: string; label?: string },
  right: { from: string; to: string; label?: string },
  unit: WeightUnit = "lb",
): CompareResult {
  const leftSessions = sessionsInRange(sessions, left.from, left.to);
  const rightSessions = sessionsInRange(sessions, right.from, right.to);
  const L = summarizeGroup(
    left.label ?? `${left.from} → ${left.to}`,
    leftSessions,
    unit,
  );
  const R = summarizeGroup(
    right.label ?? `${right.from} → ${right.to}`,
    rightSessions,
    unit,
  );
  return {
    left: L,
    right: R,
    volumeDelta: Math.round((L.totalVolume - R.totalVolume) * 100) / 100,
    workoutsDelta: L.workouts - R.workouts,
  };
}

export function compareSessions(
  left: Session,
  right: Session,
  unit: WeightUnit = "lb",
): CompareResult {
  return compareDateRanges(
    [left, right],
    { from: left.date, to: left.date, label: `Workout ${left.day} ${left.date}` },
    {
      from: right.date,
      to: right.date,
      label: `Workout ${right.day} ${right.date}`,
    },
    unit,
  );
}

export function previousPerformance(
  sessions: Session[],
  exerciseId: string,
  excludeDate?: string,
): SetEntry[] | null {
  for (const s of completedSessions(sessions).sort(
    (a, b) => b.createdAt - a.createdAt,
  )) {
    if (excludeDate && s.date === excludeDate) continue;
    const sets = s.entries[exerciseId];
    if (sets?.some((x) => x.weight || x.reps)) return sets;
  }
  return null;
}

export function nextWorkoutRecommendation(sessions: Session[]): Day {
  return suggestNextWorkout(completedSessions(sessions));
}

export function workoutSummary(session: Session, unit: WeightUnit = "lb") {
  const volumeLbs = sessionVolume(session);
  const totalSets = countSets(session);
  const durationMs =
    session.startedAt && session.completedAt
      ? session.completedAt - session.startedAt
      : null;
  return {
    sessionId: session._id,
    day: session.day,
    date: session.date,
    status: session.status ?? "completed",
    totalSets,
    totalVolume:
      unit === "kg"
        ? Math.round((volumeLbs / LB_PER_KG) * 100) / 100
        : volumeLbs,
    unit,
    lifts: sessionLiftCount(session),
    durationMinutes:
      durationMs !== null ? Math.round(durationMs / 60_000) : null,
  };
}

export function prsAchievedInSession(
  allSessions: Session[],
  session: Session,
  unit: WeightUnit = "lb",
): PersonalRecord[] {
  const others = allSessions.filter((s) => s._id !== session._id);
  const before = personalRecords(others, unit);
  const beforeMap = new Map(before.map((p) => [p.exerciseId, p]));
  const after = personalRecords([...others, session], unit);
  return after.filter((pr) => {
    if (pr.sessionId !== session._id) return false;
    const prev = beforeMap.get(pr.exerciseId);
    return !prev || pr.score > prev.score;
  });
}
