import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { PLAN } from "@/app/lib/plan";
import {
  previousPerformance,
  prsAchievedInSession,
  workoutSummary,
  type WeightUnit,
} from "@/app/lib/analytics";
import type { BackendProvider } from "../backend";
import { resolveExercise } from "../exercise-match";
import { toSessionDoc } from "../session-doc";
import { mapConvexError, okResult, toolError } from "../tool-result";
import type { SessionView } from "../types";

function remainingExercises(session: SessionView) {
  const planIds = PLAN[session.day].ex.map((e) => e.id);
  const customIds = session.customExercises.map((e) => e.id);
  const order =
    session.exerciseOrder.length > 0
      ? session.exerciseOrder
      : [...planIds, ...customIds];
  return order.filter((id) => {
    const sets = session.entries[id] ?? [];
    return !sets.some((s) => s.weight || s.reps);
  });
}

function describeActive(session: SessionView) {
  return {
    ...session,
    remainingExerciseIds: remainingExercises(session),
    loggedSetCount: Object.values(session.entries).reduce(
      (n, sets) => n + sets.filter((s) => s.weight || s.reps).length,
      0,
    ),
  };
}

export function registerSessionTools(
  server: McpServer,
  provider: BackendProvider,
) {
  server.registerTool(
    "start_workout",
    {
      title: "Start workout",
      description:
        "Create an active Workout A/B/C/D session. Fails if another workout is already active — then continue, complete, or cancel that one first. Prefer get_workout_plan with includePrevious first.",
      inputSchema: {
        day: z.enum(["A", "B", "C", "D"]).describe("Workout type"),
        startedAt: z.number().optional().describe("Optional Unix ms start time"),
        date: z
          .string()
          .optional()
          .describe("Optional local YYYY-MM-DD date for the session"),
        mode: z
          .enum(["std", "pf"])
          .optional()
          .describe("Defaults to pf (Planet Fitness)"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ day, startedAt, date, mode }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        const result = await backend.startWorkout({
          day,
          startedAt,
          date,
          mode: mode ?? "pf",
          exerciseIds: PLAN[day].ex.map((e) => e.id),
        });
        if (!result.ok) {
          return toolError(
            "ACTIVE_EXISTS",
            `Active Workout ${result.active.day} from ${result.active.date} is still open.`,
            { active: describeActive(result.active) },
          );
        }
        const history = await backend.listSessions({ limit: 100 });
        const docs = history.map(toSessionDoc);
        const previous = Object.fromEntries(
          PLAN[day].ex.map((e) => [
            e.id,
            {
              name: e.name,
              last: previousPerformance(docs, e.id, result.session.date),
            },
          ]),
        );
        return okResult(
          `Started Workout ${day} (${PLAN[day].focus}). Session ${result.session.id}. Log sets with log_exercise_set.`,
          { session: describeActive(result.session), previous },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "get_active_workout",
    {
      title: "Get active workout",
      description:
        "Return the current active workout with logged sets, remaining exercises, and status. Use this to resume an unfinished session.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const active = await backend.getActive();
        if (!active) {
          return okResult("No active workout.", { active: null });
        }
        return okResult(
          `Active Workout ${active.day} on ${active.date}. ${describeActive(active).loggedSetCount} sets logged.`,
          { active: describeActive(active) },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "log_exercise_set",
    {
      title: "Log exercise set",
      description:
        "Save one set immediately to Convex. Weight may be lb or kg (stored as lbs). If setNumber already exists, use update_exercise_set instead. Resolve ambiguous exercise names before calling.",
      inputSchema: {
        sessionId: z.string().describe("Active workout session ID"),
        exercise: z.string().describe("Exercise name or id, e.g. Bench Press"),
        weight: z.number().describe("Weight used for the set"),
        reps: z.number().describe("Reps completed (or seconds for timed holds)"),
        setNumber: z.number().int().positive().describe("1-based set number"),
        unit: z.enum(["lb", "kg"]).optional().describe("Defaults to lb"),
        equipment: z.string().optional(),
        notes: z.string().optional(),
      },
      annotations: { readOnlyHint: false },
    },
    async (
      { sessionId, exercise, weight, reps, setNumber, unit, equipment, notes },
      ctx,
    ) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        const session = await backend.getSession(sessionId);
        if (session.status !== "active") {
          return toolError("NOT_ACTIVE", "Session is not active.");
        }
        const match = resolveExercise(exercise, {
          day: session.day,
          session,
        });
        if (!match.ok) {
          return toolError(match.code, "Clarify the exercise name.", {
            candidates: match.candidates.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          });
        }
        const result = await backend.logSet({
          sessionId,
          exerciseId: match.match.id,
          weight,
          reps,
          setNumber,
          unit: (unit ?? "lb") as WeightUnit,
          equipment,
          notes,
        });
        return okResult(
          `Saved ${match.match.name} set ${setNumber}: ${weight} ${unit ?? "lb"} × ${reps}.`,
          {
            exerciseId: match.match.id,
            exerciseName: match.match.name,
            setNumber: result.setNumber,
            session: describeActive(result.session),
          },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "update_exercise_set",
    {
      title: "Update exercise set",
      description:
        "Correct weight, reps, equipment, or notes on a previously logged set.",
      inputSchema: {
        sessionId: z.string(),
        exercise: z.string(),
        setNumber: z.number().int().positive(),
        weight: z.number().optional(),
        reps: z.number().optional(),
        unit: z.enum(["lb", "kg"]).optional(),
        equipment: z.string().optional(),
        notes: z.string().optional(),
      },
      annotations: { readOnlyHint: false },
    },
    async (args, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        const session = await backend.getSession(args.sessionId);
        const match = resolveExercise(args.exercise, {
          day: session.day,
          session,
        });
        if (!match.ok) {
          return toolError(match.code, "Clarify the exercise name.", {
            candidates: match.candidates.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          });
        }
        const result = await backend.updateSet({
          sessionId: args.sessionId,
          exerciseId: match.match.id,
          setNumber: args.setNumber,
          weight: args.weight,
          reps: args.reps,
          unit: args.unit,
          equipment: args.equipment,
          notes: args.notes,
        });
        return okResult(`Updated ${match.match.name} set ${args.setNumber}.`, {
          session: describeActive(result.session),
        });
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "add_exercise_to_workout",
    {
      title: "Add exercise to workout",
      description:
        "Add an exercise that is not in the original A/B/C/D plan to the active session.",
      inputSchema: {
        sessionId: z.string(),
        name: z.string(),
        equipment: z.string().optional(),
        targetSets: z.number().optional(),
        targetReps: z.string().optional(),
        notes: z.string().optional(),
      },
      annotations: { readOnlyHint: false },
    },
    async (args, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        const result = await backend.addExercise(args);
        return okResult(`Added ${args.name} (${result.exerciseId}).`, {
          exerciseId: result.exerciseId,
          session: describeActive(result.session),
        });
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "complete_workout",
    {
      title: "Complete workout",
      description:
        "Mark the active workout completed. Requires confirm: true after user confirmation. Returns summary, volume, duration, and PRs.",
      inputSchema: {
        sessionId: z.string(),
        confirm: z
          .boolean()
          .describe("Must be true after explicit user confirmation"),
        unit: z.enum(["lb", "kg"]).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ sessionId, confirm, unit }, ctx) => {
      try {
        if (!confirm) {
          return toolError(
            "NEEDS_CONFIRMATION",
            "Ask the user to confirm completion, then call again with confirm: true.",
          );
        }
        const backend = provider.get(ctx.http?.authInfo);
        const result = await backend.completeWorkout(sessionId, true);
        const history = await backend.listSessions({ limit: 200 });
        const docs = history.map(toSessionDoc);
        const sessionDoc = toSessionDoc(result.session);
        const summary = workoutSummary(sessionDoc, unit ?? "lb");
        const prs = prsAchievedInSession(docs, sessionDoc, unit ?? "lb");
        return okResult(
          `Completed Workout ${result.session.day}: ${summary.totalSets} sets, ${summary.totalVolume} ${summary.unit} volume` +
            (summary.durationMinutes != null
              ? `, ${summary.durationMinutes} min`
              : "") +
            (prs.length ? `, ${prs.length} PR(s)` : "") +
            `.`,
          { summary, personalRecords: prs, session: result.session },
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "cancel_workout",
    {
      title: "Cancel workout",
      description:
        "Cancel an active workout only. Requires confirm: true. Does not delete completed history.",
      inputSchema: {
        sessionId: z.string(),
        confirm: z.boolean(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ sessionId, confirm }, ctx) => {
      try {
        if (!confirm) {
          return toolError(
            "NEEDS_CONFIRMATION",
            "Ask the user to confirm cancel, then call again with confirm: true.",
          );
        }
        const backend = provider.get(ctx.http?.authInfo);
        const result = await backend.cancelWorkout(sessionId, true);
        return okResult(`Cancelled active workout ${result.sessionId}.`, result);
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );
}
