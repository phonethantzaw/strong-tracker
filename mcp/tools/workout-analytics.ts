import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  exerciseProgress,
  personalRecords,
  trainingStatus,
  weeklyReport,
} from "@/app/lib/analytics";
import type { BackendProvider } from "../backend";
import { resolveExercise } from "../exercise-match";
import { toSessionDoc } from "../session-doc";
import { mapConvexError, okResult, toolError } from "../tool-result";

export function registerAnalyticsTools(
  server: McpServer,
  provider: BackendProvider,
) {
  server.registerTool(
    "get_exercise_progress",
    {
      title: "Get exercise progress",
      description:
        "Historical weight, reps, volume, and estimated 1RM for one exercise from saved sessions.",
      inputSchema: {
        exercise: z.string().describe("Exercise name or id"),
        unit: z.enum(["lb", "kg"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ exercise, unit }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const match = resolveExercise(exercise);
        if (!match.ok) {
          return toolError(match.code, "Clarify the exercise name.", {
            candidates: match.candidates.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          });
        }
        const sessions = await backend.listSessions({ limit: 500 });
        const progress = exerciseProgress(
          sessions.map(toSessionDoc),
          match.match.id,
          unit ?? "lb",
        );
        return okResult(
          `${match.match.name}: ${progress.length} logged session(s).`,
          {
            exerciseId: match.match.id,
            exerciseName: match.match.name,
            unit: unit ?? "lb",
            progress,
          },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "get_personal_records",
    {
      title: "Get personal records",
      description:
        "Best recorded set per exercise from completed workout history.",
      inputSchema: {
        unit: z.enum(["lb", "kg"]).optional(),
        exercise: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ unit, exercise }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const sessions = await backend.listSessions({ limit: 500 });
        let prs = personalRecords(sessions.map(toSessionDoc), unit ?? "lb");
        if (exercise) {
          const match = resolveExercise(exercise);
          if (!match.ok) {
            return toolError(match.code, "Clarify the exercise name.", {
              candidates: match.candidates.map((c) => ({
                id: c.id,
                name: c.name,
              })),
            });
          }
          prs = prs.filter((p) => p.exerciseId === match.match.id);
        }
        return okResult(`${prs.length} personal record(s).`, {
          unit: unit ?? "lb",
          personalRecords: prs,
        });
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "get_weekly_report",
    {
      title: "Weekly training report",
      description:
        "Weekly report with workout count, A/B/C/D distribution, volume, progression, PRs, missed workouts vs target, and previous-week comparison.",
      inputSchema: {
        weekOf: z
          .string()
          .optional()
          .describe(
            "Any YYYY-MM-DD in the target week. Defaults to current week.",
          ),
        unit: z.enum(["lb", "kg"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ weekOf, unit }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const sessions = await backend.listSessions({ limit: 500 });
        const when = weekOf ? new Date(`${weekOf}T12:00:00`) : new Date();
        const report = weeklyReport(sessions.map(toSessionDoc), when, unit ?? "lb");
        return okResult(
          `Week ${report.from}→${report.to}: ${report.workoutsCompleted} workouts, ${report.totalVolume} ${unit ?? "lb"} volume.`,
          { report },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "get_training_status",
    {
      title: "Training status overview",
      description:
        "Most recent workout, streak, monthly count, consistency, improving/stagnating lifts, and recommended next workout.",
      inputSchema: {
        unit: z.enum(["lb", "kg"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ unit }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const sessions = await backend.listSessions({ limit: 500 });
        const status = trainingStatus(
          sessions.map(toSessionDoc),
          new Date(),
          unit ?? "lb",
        );
        return okResult(
          status.mostRecent
            ? `Last: Workout ${status.mostRecent.day} on ${status.mostRecent.date}. Next: ${status.nextWorkout}. Streak ${status.currentStreak}.`
            : `No completed workouts yet. Start with Workout ${status.nextWorkout}.`,
          { status },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );
}
