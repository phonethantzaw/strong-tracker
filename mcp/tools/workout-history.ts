import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { compareDateRanges, compareSessions } from "@/app/lib/analytics";
import { sessionLiftCount, sessionVolume } from "@/app/lib/stats";
import type { BackendProvider } from "../backend";
import { toSessionDoc } from "../session-doc";
import { mapConvexError, okResult, toolError } from "../tool-result";

export function registerHistoryTools(
  server: McpServer,
  provider: BackendProvider,
) {
  server.registerTool(
    "get_workout_history",
    {
      title: "Get workout history",
      description:
        "Retrieve saved workout sessions by optional date range and workout type. Returns real Convex data only.",
      inputSchema: {
        from: z.string().optional().describe("YYYY-MM-DD"),
        to: z.string().optional().describe("YYYY-MM-DD"),
        day: z.enum(["A", "B", "C", "D"]).optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, day, limit }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const sessions = await backend.listSessions({
          from,
          to,
          day,
          status: "completed",
          limit: limit ?? 50,
        });
        const items = sessions.map((s) => ({
          id: s.id,
          date: s.date,
          day: s.day,
          mode: s.mode,
          status: s.status,
          lifts: sessionLiftCount(toSessionDoc(s)),
          volume: sessionVolume(toSessionDoc(s)),
        }));
        return okResult(`${items.length} session(s) found.`, { sessions: items });
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );

  server.registerTool(
    "compare_workouts",
    {
      title: "Compare workouts",
      description:
        "Compare two session IDs, or two date ranges. Provide either sessionIds or both left/right ranges.",
      inputSchema: {
        leftSessionId: z.string().optional(),
        rightSessionId: z.string().optional(),
        leftFrom: z.string().optional(),
        leftTo: z.string().optional(),
        rightFrom: z.string().optional(),
        rightTo: z.string().optional(),
        unit: z.enum(["lb", "kg"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const unit = args.unit ?? "lb";
        if (args.leftSessionId && args.rightSessionId) {
          const left = await backend.getSession(args.leftSessionId);
          const right = await backend.getSession(args.rightSessionId);
          const comparison = compareSessions(
            toSessionDoc(left),
            toSessionDoc(right),
            unit,
          );
          return okResult(
            `Compared sessions: volume delta ${comparison.volumeDelta} ${unit}.`,
            { comparison },
          );
        }
        if (args.leftFrom && args.leftTo && args.rightFrom && args.rightTo) {
          const sessions = await backend.listSessions({ limit: 500 });
          const comparison = compareDateRanges(
            sessions.map(toSessionDoc),
            { from: args.leftFrom, to: args.leftTo },
            { from: args.rightFrom, to: args.rightTo },
            unit,
          );
          return okResult(
            `Compared ranges: volume delta ${comparison.volumeDelta} ${unit}.`,
            { comparison },
          );
        }
        return toolError(
          "INVALID_INPUT",
          "Provide leftSessionId+rightSessionId or leftFrom/leftTo/rightFrom/rightTo.",
        );
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );
}
