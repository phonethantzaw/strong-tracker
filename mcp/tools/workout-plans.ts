import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { DAYS, PLAN, PROGRAM, type Day } from "@/app/lib/plan";
import {
  nextWorkoutRecommendation,
  previousPerformance,
} from "@/app/lib/analytics";
import type { BackendProvider } from "../backend";
import { toSessionDoc } from "../session-doc";
import { mapConvexError, okResult } from "../tool-result";

export function registerPlanTools(server: McpServer, provider: BackendProvider) {
  server.registerTool(
    "get_workout_plan",
    {
      title: "Get workout plan",
      description:
        "Retrieve the STRONG A/B/C/D exercise plan. Optionally include previous performance for each exercise from saved history.",
      inputSchema: {
        day: z
          .enum(["A", "B", "C", "D"])
          .optional()
          .describe("Workout day. Omit to return all days."),
        includePrevious: z
          .boolean()
          .optional()
          .describe("If true, attach last logged sets per exercise."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ day, includePrevious }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const days = (day ? [day] : DAYS) as Day[];
        const previous: Record<string, unknown> = {};
        if (includePrevious) {
          const sessions = await backend.listSessions({ limit: 200 });
          const docs = sessions.map(toSessionDoc);
          for (const d of days) {
            for (const ex of PLAN[d].ex) {
              previous[ex.id] = previousPerformance(docs, ex.id);
            }
          }
        }
        const plans = days.map((d) => ({
          day: d,
          title: PLAN[d].title,
          focus: PLAN[d].focus,
          warm: PLAN[d].warm,
          exercises: PLAN[d].ex.map((e) => ({
            id: e.id,
            name: e.name,
            targetSets: e.sets,
            targetReps: e.reps,
            equipment: e.pf,
            rest: e.rest,
            restSeconds: e.restS,
            notes: e.note,
            rir: e.rir,
            videoUrl: e.videoUrl,
            previous: previous[e.id] ?? undefined,
          })),
        }));
        return okResult(
          day
            ? `${PLAN[day].title}: ${PLAN[day].focus}. ${PLAN[day].ex.length} exercises.`
            : `STRONG plan: Workouts ${DAYS.join(", ")}. Target ${PROGRAM.targetPerWeek}/week.`,
          { program: PROGRAM, plans },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "get_next_workout",
    {
      title: "Recommend next workout",
      description:
        "Recommend the next A/B/C/D workout from the program rotation and recent completed sessions.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const sessions = await backend.listSessions({ limit: 100 });
        const next = nextWorkoutRecommendation(sessions.map(toSessionDoc));
        const latest = sessions.find((s) => s.status !== "cancelled");
        return okResult(
          `Recommended next: Workout ${next} (${PLAN[next].focus}).`,
          {
            nextWorkout: next,
            focus: PLAN[next].focus,
            exercises: PLAN[next].ex.map((e) => e.name),
            lastCompleted: latest
              ? { day: latest.day, date: latest.date, status: latest.status }
              : null,
          },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );
}
