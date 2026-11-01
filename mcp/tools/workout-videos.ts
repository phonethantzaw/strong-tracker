import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { PLAN, type Day } from "@/app/lib/plan";
import type { BackendProvider } from "../backend";
import { resolveExercise } from "../exercise-match";
import { mapConvexError, okResult, toolError } from "../tool-result";

type VideoItem = {
  kind: "exercise" | "warmup" | "cooldown";
  name: string;
  day?: Day;
  videoUrl: string | null;
  appUrl?: string;
};

function appLink(path: string): string | undefined {
  const base = process.env.STRONG_APP_URL?.replace(/\/+$/, "");
  return base ? `${base}${path}` : undefined;
}

function exerciseItem(id: string, day: Day): VideoItem | null {
  const ex = PLAN[day].ex.find((e) => e.id === id);
  if (!ex) return null;
  return {
    kind: "exercise",
    name: ex.name,
    day,
    videoUrl: ex.videoUrl ?? null,
    appUrl: appLink(`/track?day=${day}`),
  };
}

function dayItems(day: Day): VideoItem[] {
  return PLAN[day].ex.map((ex) => ({
    kind: "exercise" as const,
    name: ex.name,
    day,
    videoUrl: ex.videoUrl ?? null,
    appUrl: appLink(`/track?day=${day}`),
  }));
}

function formatItems(items: VideoItem[]): string {
  if (!items.length) return "No videos found.";
  return items
    .map((i) => {
      const label = i.day ? `${i.name} (Workout ${i.day})` : i.name;
      if (!i.videoUrl) return `- ${label}: no video available`;
      const app = i.appUrl ? ` · [Open in STRONG](${i.appUrl})` : "";
      return `- [${label} video](${i.videoUrl})${app}`;
    })
    .join("\n");
}

export function registerVideoTools(
  server: McpServer,
  provider: BackendProvider,
) {
  server.registerTool(
    "get_workout_videos",
    {
      title: "Get workout videos",
      description:
        "Get video links for an exercise, a whole workout day, or the warm-up/cool-down. Use when the user asks to see or share a workout video. Share returned links as-is; never invent URLs.",
      inputSchema: {
        exercise: z
          .string()
          .optional()
          .describe("Exercise name or id, e.g. Bench Press"),
        day: z.enum(["A", "B", "C", "D"]).optional(),
        include: z
          .enum(["exercise", "warmup", "cooldown", "all"])
          .optional()
          .describe("Which videos to return. Defaults to all relevant."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ exercise, day, include }, ctx) => {
      try {
        const backend = provider.get(ctx.http?.authInfo);
        await backend.consumeReadLimit();
        const items: VideoItem[] = [];
        const want = include ?? "all";

        if (exercise) {
          const match = resolveExercise(exercise, { day });
          if (!match.ok) {
            return toolError(match.code, "Clarify the exercise name.", {
              candidates: match.candidates.map((c) => ({
                id: c.id,
                name: c.name,
              })),
            });
          }
          const exDay = match.match.day ?? day;
          const item = exDay ? exerciseItem(match.match.id, exDay) : null;
          if (item) items.push(item);
          else
            items.push({
              kind: "exercise",
              name: match.match.name,
              videoUrl: null,
            });
        } else if (day) {
          if (want === "all" || want === "exercise") items.push(...dayItems(day));
        } else if (want === "all" || want === "exercise") {
          const active = await backend.getActive();
          if (active) items.push(...dayItems(active.day));
        }

        if (!exercise && (want === "all" || want === "warmup" || want === "cooldown")) {
          const urls = await backend.getProgramVideos();
          if (want === "all" || want === "warmup") {
            items.push({
              kind: "warmup",
              name: "Warm-up",
              videoUrl: urls.warmupUrl,
              appUrl: appLink("/videos"),
            });
          }
          if (want === "all" || want === "cooldown") {
            items.push({
              kind: "cooldown",
              name: "Cool-down",
              videoUrl: urls.cooldownUrl,
              appUrl: appLink("/videos"),
            });
          }
        }

        return okResult(formatItems(items), { videos: items });
      } catch (err) {
        return mapConvexError(err);
      }
    },
  );
}
