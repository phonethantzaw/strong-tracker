import { describe, expect, it } from "vitest";
import { resolveExercise } from "./exercise-match";

describe("resolveExercise", () => {
  it("matches exact and fuzzy names", () => {
    const exact = resolveExercise("Bench Press", { day: "A" });
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(exact.match.id).toBe("a_bench");

    const fuzzy = resolveExercise("bench", { day: "A" });
    expect(fuzzy.ok).toBe(true);
  });

  it("returns candidates when not found", () => {
    const miss = resolveExercise("cartwheel", { day: "A" });
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.candidates.length).toBeGreaterThan(0);
  });
});
