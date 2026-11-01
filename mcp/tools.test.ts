import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { staticBackendProvider } from "./backend";
import { createStrongMcpServer } from "./server";
import type { SessionView, StrongBackend } from "./types";

function makeSession(partial?: Partial<SessionView>): SessionView {
  return {
    id: "sess_1",
    date: "2026-10-31",
    day: "A",
    mode: "pf",
    status: "active",
    startedAt: Date.now(),
    entries: {},
    exerciseOrder: ["a_bench", "a_incline", "a_fly", "a_tri_push", "a_tri_oh"],
    customExercises: [],
    createdAt: Date.now(),
    ...partial,
  };
}

function fakeBackend(overrides: Partial<StrongBackend> = {}): StrongBackend {
  let active: SessionView | null = null;
  const sessions: SessionView[] = [];

  const base: StrongBackend = {
    auth: { kind: "pat", token: "strong_pat_test" },
    async getActive() {
      return active;
    },
    async getSession(id) {
      const found = sessions.find((s) => s.id === id) ?? active;
      if (!found || found.id !== id) throw new Error("NOT_FOUND");
      return found;
    },
    async listSessions() {
      return sessions.filter((s) => s.status !== "cancelled");
    },
    async startWorkout({ day, date }) {
      if (active) return { ok: false, code: "ACTIVE_EXISTS", active };
      active = makeSession({ day, date: date ?? "2026-10-31" });
      sessions.push(active);
      return { ok: true, session: active };
    },
    async logSet(args) {
      if (!active || active.id !== args.sessionId) throw new Error("NOT_ACTIVE");
      const sets = [...(active.entries[args.exerciseId] ?? [])];
      const idx = args.setNumber - 1;
      if (sets[idx]?.weight || sets[idx]?.reps) throw new Error("SET_EXISTS");
      while (sets.length < args.setNumber) sets.push({ weight: "", reps: "" });
      sets[idx] = {
        weight: String(args.weight),
        reps: String(args.reps),
        notes: args.notes,
        equipment: args.equipment,
        inputUnit: args.unit,
        loggedAt: Date.now(),
      };
      active = {
        ...active,
        entries: { ...active.entries, [args.exerciseId]: sets },
      };
      return { ok: true, session: active, setNumber: args.setNumber };
    },
    async updateSet() {
      throw new Error("FAILED");
    },
    async addExercise() {
      throw new Error("FAILED");
    },
    async completeWorkout(sessionId, confirm) {
      if (!confirm) throw new Error("NEEDS_CONFIRMATION");
      if (!active || active.id !== sessionId) throw new Error("NOT_ACTIVE");
      active = { ...active, status: "completed", completedAt: Date.now() };
      return { ok: true, session: active };
    },
    async cancelWorkout(sessionId, confirm) {
      if (!confirm) throw new Error("NEEDS_CONFIRMATION");
      if (!active || active.id !== sessionId) throw new Error("NOT_ACTIVE");
      active = { ...active, status: "cancelled" };
      return { ok: true, sessionId };
    },
    async consumeReadLimit() {},
    async getProgramVideos() {
      return {
        warmupUrl: "https://example.com/warmup.mp4",
        cooldownUrl: "https://example.com/cooldown.mp4",
      };
    },
    ...overrides,
  };
  return base;
}

async function withClient(backend: StrongBackend) {
  const server = createStrongMcpServer(staticBackendProvider(backend));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

describe("mcp tools", () => {
  it("lists tools and starts/logs/completes a workout", async () => {
    const { client } = await withClient(fakeBackend());
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).toContain("start_workout");
    expect(names).toContain("log_exercise_set");
    expect(names).toContain("get_weekly_report");

    const started = await client.callTool({
      name: "start_workout",
      arguments: { day: "A" },
    });
    expect(started.isError).toBeFalsy();

    const logged = await client.callTool({
      name: "log_exercise_set",
      arguments: {
        sessionId: "sess_1",
        exercise: "Bench Press",
        weight: 135,
        reps: 10,
        setNumber: 1,
      },
    });
    expect(logged.isError).toBeFalsy();
    const text = JSON.stringify(logged.content);
    expect(text).toContain("Saved");

    const needsConfirm = await client.callTool({
      name: "complete_workout",
      arguments: { sessionId: "sess_1", confirm: false },
    });
    expect(needsConfirm.isError).toBeTruthy();

    const completed = await client.callTool({
      name: "complete_workout",
      arguments: { sessionId: "sess_1", confirm: true },
    });
    expect(completed.isError).toBeFalsy();
  });

  it("returns ambiguous/not found exercise errors", async () => {
    const backend = fakeBackend();
    await backend.startWorkout({ day: "A", date: "2026-10-31" });
    const { client } = await withClient(backend);
    const result = await client.callTool({
      name: "log_exercise_set",
      arguments: {
        sessionId: "sess_1",
        exercise: "totally unknown lift",
        weight: 100,
        reps: 5,
        setNumber: 1,
      },
    });
    expect(result.isError).toBeTruthy();
  });

  it("surfaces failed writes without fabricating success", async () => {
    const backend = fakeBackend({
      async logSet() {
        throw new Error("FAILED");
      },
    });
    await backend.startWorkout({ day: "A" });
    const { client } = await withClient(backend);
    const result = await client.callTool({
      name: "log_exercise_set",
      arguments: {
        sessionId: "sess_1",
        exercise: "Bench Press",
        weight: 135,
        reps: 10,
        setNumber: 1,
      },
    });
    expect(result.isError).toBeTruthy();
    expect(JSON.stringify(result.content)).not.toMatch(/Saved Bench/);
  });

  it("returns exercise, day, and program videos", async () => {
    const { client } = await withClient(fakeBackend());

    const bench = await client.callTool({
      name: "get_workout_videos",
      arguments: { exercise: "Bench Press" },
    });
    expect(bench.isError).toBeFalsy();
    expect(JSON.stringify(bench.content)).toContain("https://youtu.be/D8hdaIMAAJQ");

    const dayD = await client.callTool({
      name: "get_workout_videos",
      arguments: { day: "D", include: "exercise" },
    });
    const dayText = JSON.stringify(dayD.content);
    expect(dayText).toContain("Full_Squats.mp4");
    expect(dayText).toContain("Calf-Raises.mp4");

    const warm = await client.callTool({
      name: "get_workout_videos",
      arguments: { include: "warmup" },
    });
    expect(JSON.stringify(warm.content)).toContain("warmup.mp4");
    expect(JSON.stringify(warm.content)).not.toContain("cooldown.mp4");
  });

  it("errors on unknown video exercise", async () => {
    const { client } = await withClient(fakeBackend());
    const result = await client.callTool({
      name: "get_workout_videos",
      arguments: { exercise: "totally unknown lift" },
    });
    expect(result.isError).toBeTruthy();
  });
});
