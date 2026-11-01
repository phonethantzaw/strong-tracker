import { describe, expect, it } from "vitest";
import {
  compareDateRanges,
  estimated1RM,
  exerciseProgress,
  fromInputWeight,
  personalRecords,
  toDisplayWeight,
  trainingStatus,
  weeklyReport,
  workoutSummary,
} from "./analytics";
import type { Session } from "./stats";

function session(
  overrides: Partial<Session> & Pick<Session, "date" | "day" | "entries">,
): Session {
  return {
    _id: (overrides._id ?? `sess_${overrides.date}_${overrides.day}`) as never,
    _creationTime: overrides.createdAt ?? 1,
    userId: "user_1",
    mode: "pf",
    createdAt: overrides.createdAt ?? Date.parse(`${overrides.date}T12:00:00Z`),
    status: overrides.status ?? "completed",
    ...overrides,
  };
}

describe("analytics", () => {
  it("estimates 1RM with Epley", () => {
    expect(estimated1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimated1RM(135, 1)).toBe(135);
  });

  it("converts lb/kg", () => {
    expect(fromInputWeight(10, "kg")).toBeCloseTo(22.05, 1);
    expect(toDisplayWeight(22.046226218, "kg")).toBeCloseTo(10, 1);
  });

  it("tracks exercise progress and PRs", () => {
    const sessions = [
      session({
        date: "2026-10-01",
        day: "A",
        entries: { a_bench: [{ weight: "135", reps: "10" }] },
      }),
      session({
        date: "2026-10-08",
        day: "A",
        entries: { a_bench: [{ weight: "155", reps: "10" }] },
      }),
    ];
    const progress = exerciseProgress(sessions, "a_bench");
    expect(progress).toHaveLength(2);
    expect(progress[1].bestWeight).toBe(155);

    const prs = personalRecords(sessions);
    expect(prs[0]?.exerciseId).toBe("a_bench");
    expect(prs[0]?.weight).toBe(155);
  });

  it("builds weekly report and status", () => {
    const sessions = [
      session({
        date: "2026-10-27",
        day: "A",
        entries: { a_bench: [{ weight: "135", reps: "10" }] },
        createdAt: Date.parse("2026-10-27T18:00:00Z"),
      }),
      session({
        date: "2026-10-28",
        day: "B",
        entries: { b_row: [{ weight: "115", reps: "10" }] },
        createdAt: Date.parse("2026-10-28T18:00:00Z"),
      }),
      session({
        date: "2026-10-20",
        day: "C",
        entries: { c_ohp: [{ weight: "50", reps: "10" }] },
        createdAt: Date.parse("2026-10-20T18:00:00Z"),
      }),
    ];
    const report = weeklyReport(sessions, new Date("2026-10-29T12:00:00"));
    expect(report.workoutsCompleted).toBe(2);
    expect(report.distribution.A).toBe(1);
    expect(report.distribution.B).toBe(1);
    expect(report.previousWeek.workoutsCompleted).toBe(1);
    expect(report.missedWorkouts).toBe(2);

    const status = trainingStatus(sessions, new Date("2026-10-29T12:00:00"));
    expect(status.nextWorkout).toBe("C");
    expect(status.mostRecent?.day).toBe("B");
  });

  it("compares date ranges and summarizes workouts", () => {
    const left = session({
      _id: "left" as never,
      date: "2026-10-01",
      day: "A",
      entries: { a_bench: [{ weight: "100", reps: "10" }] },
      startedAt: 1,
      completedAt: 1 + 30 * 60_000,
    });
    const right = session({
      _id: "right" as never,
      date: "2026-10-08",
      day: "A",
      entries: { a_bench: [{ weight: "110", reps: "10" }] },
    });
    const comparison = compareDateRanges(
      [left, right],
      { from: "2026-10-01", to: "2026-10-01" },
      { from: "2026-10-08", to: "2026-10-08" },
    );
    expect(comparison.volumeDelta).toBe(-100);
    expect(workoutSummary(left).durationMinutes).toBe(30);
  });

  it("ignores active and cancelled sessions in reports", () => {
    const sessions = [
      session({
        date: "2026-10-29",
        day: "A",
        status: "active",
        entries: { a_bench: [{ weight: "135", reps: "5" }] },
      }),
      session({
        date: "2026-10-28",
        day: "B",
        status: "cancelled",
        entries: { b_row: [{ weight: "100", reps: "8" }] },
      }),
    ];
    expect(weeklyReport(sessions, new Date("2026-10-29T12:00:00")).workoutsCompleted).toBe(0);
    expect(personalRecords(sessions)).toHaveLength(0);
  });
});
