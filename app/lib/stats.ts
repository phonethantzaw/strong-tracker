import type { Doc } from "@/convex/_generated/dataModel";
import { DAYS, PLAN, type Day } from "./plan";

export type Session = Doc<"sessions">;
export type SetEntry = { weight: string; reps: string };

export type WeeklyVolumePoint = {
  date: string;
  label: string;
  volume: number;
  sessions: number;
};

export type RecentPR = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  score: number;
};

export type ActivityItem = {
  id: string;
  date: string;
  day: Day;
  mode: Session["mode"];
  liftCount: number;
  volume: number;
  createdAt: number;
};

export type Nudge = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

export type DashboardStats = {
  sessionsThisWeek: number;
  currentStreak: number;
  totalVolume: number;
  weeklyVolume: number;
  loggedDates: string[];
  recentPRs: RecentPR[];
  weeklyChart: WeeklyVolumePoint[];
  recentActivity: ActivityItem[];
  nudges: Nudge[];
  nextWorkout: Day;
  loading: boolean;
};

const MS_DAY = 86_400_000;

export function parseNum(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function setVolume(set: SetEntry): number {
  const weight = parseNum(set.weight);
  const reps = parseNum(set.reps);
  if (!weight && !reps) return 0;
  if (!weight) return reps;
  return weight * reps;
}

export function sessionVolume(session: Session): number {
  return Object.values(session.entries).reduce(
    (total, sets) => total + sets.reduce((sum, set) => sum + setVolume(set), 0),
    0,
  );
}

export function sessionLiftCount(session: Session): number {
  return Object.values(session.entries).filter((sets) =>
    sets.some((set) => set.weight || set.reps),
  ).length;
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function getExerciseName(exerciseId: string): string {
  for (const day of Object.keys(PLAN) as Day[]) {
    const match = PLAN[day].ex.find((e) => e.id === exerciseId);
    if (match) return match.name;
  }
  return exerciseId;
}

export function sessionsThisWeek(sessions: Session[], now = new Date()): number {
  const weekStart = startOfWeek(now).getTime();
  return sessions.filter((s) => new Date(`${s.date}T12:00:00`).getTime() >= weekStart).length;
}

export function weeklyVolumeTotal(sessions: Session[], now = new Date()): number {
  const weekStart = startOfWeek(now).getTime();
  return sessions
    .filter((s) => new Date(`${s.date}T12:00:00`).getTime() >= weekStart)
    .reduce((sum, s) => sum + sessionVolume(s), 0);
}

export function totalVolume(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + sessionVolume(s), 0);
}

export function currentStreak(sessions: Session[]): number {
  if (!sessions.length) return 0;

  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today.getTime() - i * MS_DAY);
    if (uniqueDates[i] === dateKey(expected)) {
      streak += 1;
      continue;
    }
    if (i === 0) {
      const yesterday = new Date(today.getTime() - MS_DAY);
      if (uniqueDates[0] === dateKey(yesterday)) {
        streak = 1;
        for (let j = 1; j < uniqueDates.length; j++) {
          const exp = new Date(yesterday.getTime() - (j - 1) * MS_DAY);
          if (uniqueDates[j] === dateKey(exp)) streak += 1;
          else break;
        }
      }
    }
    break;
  }

  return streak;
}

export function weeklyVolumeChart(sessions: Session[], now = new Date()): WeeklyVolumePoint[] {
  const points: WeeklyVolumePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * MS_DAY);
    const key = dateKey(d);
    const daySessions = sessions.filter((s) => s.date === key);
    points.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      volume: daySessions.reduce((sum, s) => sum + sessionVolume(s), 0),
      sessions: daySessions.length,
    });
  }
  return points;
}

export function recentPRs(sessions: Session[], limit = 5): RecentPR[] {
  const best = new Map<string, RecentPR>();

  for (const session of sessions) {
    for (const [exerciseId, sets] of Object.entries(session.entries)) {
      for (const set of sets) {
        const weight = parseNum(set.weight);
        const reps = parseNum(set.reps);
        if (!weight && !reps) continue;
        const score = weight ? weight * Math.max(reps, 1) : reps;
        const current = best.get(exerciseId);
        if (!current || score > current.score) {
          best.set(exerciseId, {
            exerciseId,
            exerciseName: getExerciseName(exerciseId),
            weight,
            reps,
            date: session.date,
            score,
          });
        }
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function recentActivity(sessions: Session[], limit = 8): ActivityItem[] {
  return sessions.slice(0, limit).map((s) => ({
    id: s._id,
    date: s.date,
    day: s.day,
    mode: s.mode,
    liftCount: sessionLiftCount(s),
    volume: sessionVolume(s),
    createdAt: s.createdAt,
  }));
}

export function suggestNextWorkout(sessions: Session[]): Day {
  const latest = sessions[0];
  if (!latest) return "A";
  const idx = DAYS.indexOf(latest.day);
  return DAYS[(idx + 1) % DAYS.length];
}

export function buildNudges(sessions: Session[], now = new Date()): Nudge[] {
  const nudges: Nudge[] = [];
  const next = suggestNextWorkout(sessions);

  if (!sessions.length) {
    nudges.push({
      id: "first-session",
      title: "Start your first session",
      body: "Log Workout A to begin tracking progressive overload.",
      href: "/track?day=A",
    });
    return nudges;
  }

  const latestDate = sessions[0]?.date;
  if (latestDate) {
    const daysSince =
      Math.floor(
        (now.getTime() - new Date(`${latestDate}T12:00:00`).getTime()) / MS_DAY,
      );
    if (daysSince >= 3) {
      nudges.push({
        id: "rest-too-long",
        title: `${daysSince} days since last session`,
        body: `Time to hit Workout ${next}. Consistency drives gains.`,
        href: `/track?day=${next}`,
      });
    }
  }

  const today = dateKey(now);
  const loggedToday = sessions.some((s) => s.date === today);
  if (!loggedToday) {
    nudges.push({
      id: "log-today",
      title: `Ready for Workout ${next}?`,
      body: "Open the tracker and beat last week's numbers.",
      href: `/track?day=${next}`,
    });
  }

  const weekCount = sessionsThisWeek(sessions, now);
  if (weekCount >= 3) {
    nudges.push({
      id: "week-strong",
      title: "Strong week",
      body: `${weekCount} sessions logged this week. Keep the momentum.`,
    });
  }

  return nudges.slice(0, 5);
}

export function computeDashboardStats(
  sessions: Session[] | undefined,
): DashboardStats {
  if (!sessions) {
    return {
      sessionsThisWeek: 0,
      currentStreak: 0,
      totalVolume: 0,
      weeklyVolume: 0,
      loggedDates: [],
      recentPRs: [],
      weeklyChart: weeklyVolumeChart([]),
      recentActivity: [],
      nudges: [],
      nextWorkout: "A",
      loading: true,
    };
  }

  return {
    sessionsThisWeek: sessionsThisWeek(sessions),
    currentStreak: currentStreak(sessions),
    totalVolume: totalVolume(sessions),
    weeklyVolume: weeklyVolumeTotal(sessions),
    loggedDates: [...new Set(sessions.map((s) => s.date))],
    recentPRs: recentPRs(sessions),
    weeklyChart: weeklyVolumeChart(sessions),
    recentActivity: recentActivity(sessions),
    nudges: buildNudges(sessions),
    nextWorkout: suggestNextWorkout(sessions),
    loading: false,
  };
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 10_000) return `${(volume / 1_000).toFixed(1)}k`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}k`;
  return volume.toLocaleString();
}
