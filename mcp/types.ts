import type { Day, Mode } from "@/app/lib/plan";
import type { WeightUnit } from "@/app/lib/analytics";

export type McpAuthPayload =
  | { kind: "pat"; token: string }
  | { kind: "service"; secret: string; userId: string };

export type SessionView = {
  id: string;
  date: string;
  day: Day;
  mode: Mode;
  status: "active" | "completed" | "cancelled";
  startedAt?: number;
  completedAt?: number;
  entries: Record<
    string,
    Array<{
      weight: string;
      reps: string;
      equipment?: string;
      notes?: string;
      loggedAt?: number;
      inputUnit?: WeightUnit;
    }>
  >;
  exerciseOrder: string[];
  customExercises: Array<{
    id: string;
    name: string;
    equipment?: string;
    targetSets?: number;
    targetReps?: string;
    notes?: string;
  }>;
  createdAt: number;
};

export type StrongBackend = {
  auth: McpAuthPayload;
  getActive(): Promise<SessionView | null>;
  getSession(sessionId: string): Promise<SessionView>;
  listSessions(opts?: {
    from?: string;
    to?: string;
    day?: Day;
    status?: "active" | "completed" | "cancelled";
    limit?: number;
  }): Promise<SessionView[]>;
  startWorkout(args: {
    day: Day;
    mode?: Mode;
    date?: string;
    startedAt?: number;
    exerciseIds?: string[];
  }): Promise<
    | { ok: true; session: SessionView }
    | { ok: false; code: "ACTIVE_EXISTS"; active: SessionView }
  >;
  logSet(args: {
    sessionId: string;
    exerciseId: string;
    weight: number;
    reps: number;
    setNumber: number;
    unit?: WeightUnit;
    equipment?: string;
    notes?: string;
  }): Promise<{ ok: true; session: SessionView; setNumber: number }>;
  updateSet(args: {
    sessionId: string;
    exerciseId: string;
    setNumber: number;
    weight?: number;
    reps?: number;
    unit?: WeightUnit;
    equipment?: string;
    notes?: string;
  }): Promise<{ ok: true; session: SessionView }>;
  addExercise(args: {
    sessionId: string;
    name: string;
    exerciseId?: string;
    equipment?: string;
    targetSets?: number;
    targetReps?: string;
    notes?: string;
  }): Promise<{ ok: true; exerciseId: string; session: SessionView }>;
  completeWorkout(
    sessionId: string,
    confirm: boolean,
  ): Promise<{ ok: true; session: SessionView }>;
  cancelWorkout(
    sessionId: string,
    confirm: boolean,
  ): Promise<{ ok: true; sessionId: string }>;
  consumeReadLimit(): Promise<void>;
  getProgramVideos(): Promise<{
    warmupUrl: string | null;
    cooldownUrl: string | null;
  }>;
};
