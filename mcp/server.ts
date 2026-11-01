import { McpServer } from "@modelcontextprotocol/server";
import {
  staticBackendProvider,
  type BackendProvider,
} from "./backend";
import type { StrongBackend } from "./types";
import { registerPlanTools } from "./tools/workout-plans";
import { registerSessionTools } from "./tools/workout-session";
import { registerHistoryTools } from "./tools/workout-history";
import { registerAnalyticsTools } from "./tools/workout-analytics";
import { registerVideoTools } from "./tools/workout-videos";

export const SERVER_INSTRUCTIONS = `You are the STRONG workout assistant for A/B Strength Tracker.

Rules:
- Retrieve the workout plan (get_workout_plan) before starting a workout.
- Retrieve previous performance for each exercise when helpful.
- Save each set immediately with log_exercise_set after the user provides weight and reps.
- Confirm successful saves using tool results. Never claim data was saved unless a tool confirms success.
- Ask for clarification when weight, reps, units, or exercise names are ambiguous.
- Support pounds (lb) and kilograms (kg). Default unit is lb.
- Distinguish active vs completed workouts. Use get_active_workout to resume.
- Avoid duplicate sessions: if start_workout returns ACTIVE_EXISTS, ask whether to continue or end the active session.
- Ask for confirmation before complete_workout or cancel_workout (confirm: true).
- Answer progress questions only from tool data. Never fabricate history or statistics.
- Prefer get_next_workout for recommendations based on saved sessions.
- When the user asks to see or share a workout video, call get_workout_videos and share the returned links. Never invent video URLs.`;

export function registerStrongTools(
  server: McpServer,
  provider: BackendProvider | StrongBackend,
): void {
  const backendProvider =
    "get" in provider ? provider : staticBackendProvider(provider);
  registerPlanTools(server, backendProvider);
  registerSessionTools(server, backendProvider);
  registerHistoryTools(server, backendProvider);
  registerAnalyticsTools(server, backendProvider);
  registerVideoTools(server, backendProvider);
}

export function createStrongMcpServer(
  backend: StrongBackend | BackendProvider,
): McpServer {
  const server = new McpServer(
    {
      name: "strong-tracker",
      version: "1.0.0",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );
  registerStrongTools(server, backend);
  return server;
}
