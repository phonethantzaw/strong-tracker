import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Day, Mode } from "@/app/lib/plan";
import type { WeightUnit } from "@/app/lib/analytics";
import type { McpAuthPayload, SessionView, StrongBackend } from "./types";

export function createConvexBackend(
  convexUrl: string,
  auth: McpAuthPayload,
): StrongBackend {
  const client = new ConvexHttpClient(convexUrl);

  return {
    auth,
    async getActive() {
      return (await client.query(api.mcp.getActive, { auth })) as SessionView | null;
    },
    async getSession(sessionId) {
      return (await client.query(api.mcp.getSession, {
        auth,
        sessionId: sessionId as Id<"sessions">,
      })) as SessionView;
    },
    async listSessions(opts = {}) {
      return (await client.query(api.mcp.listSessions, {
        auth,
        from: opts.from,
        to: opts.to,
        day: opts.day,
        status: opts.status,
        limit: opts.limit,
      })) as SessionView[];
    },
    async startWorkout(args) {
      return (await client.mutation(api.mcp.startWorkout, {
        auth,
        day: args.day,
        mode: args.mode,
        date: args.date,
        startedAt: args.startedAt,
        exerciseIds: args.exerciseIds,
      })) as Awaited<ReturnType<StrongBackend["startWorkout"]>>;
    },
    async logSet(args) {
      return (await client.mutation(api.mcp.logSet, {
        auth,
        sessionId: args.sessionId as Id<"sessions">,
        exerciseId: args.exerciseId,
        weight: args.weight,
        reps: args.reps,
        setNumber: args.setNumber,
        unit: args.unit,
        equipment: args.equipment,
        notes: args.notes,
      })) as Awaited<ReturnType<StrongBackend["logSet"]>>;
    },
    async updateSet(args) {
      return (await client.mutation(api.mcp.updateSet, {
        auth,
        sessionId: args.sessionId as Id<"sessions">,
        exerciseId: args.exerciseId,
        setNumber: args.setNumber,
        weight: args.weight,
        reps: args.reps,
        unit: args.unit as WeightUnit | undefined,
        equipment: args.equipment,
        notes: args.notes,
      })) as Awaited<ReturnType<StrongBackend["updateSet"]>>;
    },
    async addExercise(args) {
      return (await client.mutation(api.mcp.addExercise, {
        auth,
        sessionId: args.sessionId as Id<"sessions">,
        name: args.name,
        exerciseId: args.exerciseId,
        equipment: args.equipment,
        targetSets: args.targetSets,
        targetReps: args.targetReps,
        notes: args.notes,
      })) as Awaited<ReturnType<StrongBackend["addExercise"]>>;
    },
    async completeWorkout(sessionId, confirm) {
      return (await client.mutation(api.mcp.completeWorkout, {
        auth,
        sessionId: sessionId as Id<"sessions">,
        confirm,
      })) as Awaited<ReturnType<StrongBackend["completeWorkout"]>>;
    },
    async cancelWorkout(sessionId, confirm) {
      return (await client.mutation(api.mcp.cancelWorkout, {
        auth,
        sessionId: sessionId as Id<"sessions">,
        confirm,
      })) as Awaited<ReturnType<StrongBackend["cancelWorkout"]>>;
    },
    async consumeReadLimit() {
      await client.mutation(api.mcp.consumeReadLimit, { auth });
    },
    async getProgramVideos() {
      return await client.query(api.programVideos.getUrls, {});
    },
  };
}

export type { Day, Mode };
