import type { SessionView } from "./types";

export function toSessionDoc(s: SessionView) {
  return {
    _id: s.id as never,
    _creationTime: s.createdAt,
    userId: "",
    date: s.date,
    day: s.day,
    mode: s.mode,
    entries: s.entries,
    createdAt: s.createdAt,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    exerciseOrder: s.exerciseOrder,
    customExercises: s.customExercises,
  };
}
