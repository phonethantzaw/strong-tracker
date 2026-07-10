"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, PlayCircle, TimerReset } from "lucide-react";
import type { Exercise, Mode } from "@/app/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SetEntry } from "./types";

function fmtSets(sets: SetEntry[], hint: string) {
  return sets
    .filter((s) => s.weight || s.reps)
    .map((s) => (hint === "sec" ? `${s.reps || "?"}s` : `${s.weight || "–"}×${s.reps || "–"}`))
    .join("  ·  ");
}

type ExerciseCardProps = {
  ex: Exercise;
  index: number;
  mode: Mode;
  open: boolean;
  draft: SetEntry[];
  last: { date: string; sets: SetEntry[] } | null;
  onToggle: () => void;
  onSet: (idx: number, field: keyof SetEntry, val: string) => void;
  onRest: () => void;
};

export function ExerciseCard({
  ex,
  index,
  mode,
  open,
  draft,
  last,
  onToggle,
  onSet,
  onRest,
}: ExerciseCardProps) {
  const isTime = ex.repField === "sec";
  const done = draft.some((s) => (isTime ? s.reps : s.weight || s.reps));
  const repPlaceholder = ex.reps.match(/^[0-9–/]+/)?.[0] || "–";

  return (
    <Card className={cn("gap-0 overflow-hidden border-border/70", done && "border-primary/60")}>
      <CardHeader className="px-4 py-3">
        <button
          type="button"
          className="flex min-h-11 w-full items-start gap-3 text-left"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`exercise-${ex.id}`}
        >
          <div className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {ex.sets} × {ex.reps}
              {ex.rir ? ` · RIR ${ex.rir}` : ""} · rest {ex.rest}
            </p>
            {mode === "pf" && ex.pf ? (
              <Badge variant="outline" className="mt-2 block max-w-full whitespace-normal break-words text-left leading-snug">
                PF: {ex.pf}
              </Badge>
            ) : null}
          </div>
          <CheckCircle2 className={cn("mt-0.5 size-5 shrink-0 text-muted-foreground", done && "text-primary")} />
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CardHeader>

      {open ? (
        <CardContent className="space-y-4 border-t px-4 py-4" id={`exercise-${ex.id}`}>
          <p className="break-words text-xs text-muted-foreground">
            {last ? (
              <>
                Last ({last.date}): <span className="font-medium text-foreground">{fmtSets(last.sets, ex.hint) || "–"}</span>
              </>
            ) : (
              "No history yet - log your first session."
            )}
          </p>

          <div className="space-y-2">
            {draft.map((s, idx) => (
              <div key={idx} className={cn("grid gap-2", isTime ? "grid-cols-[auto_1fr]" : "grid-cols-[auto_1fr_1fr]")}>
                <div className="flex items-center text-xs text-muted-foreground">{idx + 1}</div>
                {isTime ? (
                  <Input
                    inputMode="numeric"
                    placeholder={repPlaceholder}
                    value={s.reps}
                    aria-label={`Set ${idx + 1} seconds`}
                    onChange={(ev) => onSet(idx, "reps", ev.target.value)}
                  />
                ) : (
                  <>
                    <Input
                      inputMode="numeric"
                      placeholder={ex.hint}
                      value={s.weight}
                      aria-label={`Set ${idx + 1} weight`}
                      onChange={(ev) => onSet(idx, "weight", ev.target.value)}
                    />
                    <Input
                      inputMode="numeric"
                      placeholder={repPlaceholder}
                      value={s.reps}
                      aria-label={`Set ${idx + 1} reps`}
                      onChange={(ev) => onSet(idx, "reps", ev.target.value)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {ex.note ? <p className="text-xs text-muted-foreground">{ex.note}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-11 flex-1 sm:flex-none" onClick={onRest}>
              <TimerReset className="size-4" />
              Rest {ex.rest}
            </Button>
            {ex.videoUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 flex-1 sm:flex-none"
                onClick={() => window.open(ex.videoUrl, "_blank", "noopener,noreferrer")}
              >
                <PlayCircle className="size-4" />
                Watch
              </Button>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export const startTimerRef: { current: ((sec: number, name: string) => void) | null } = { current: null };

export function RestTimer({
  registerStart,
}: {
  registerStart: (fn: (sec: number, name: string) => void) => void;
}) {
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [name, setName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    registerStart((sec: number, exName: string) => {
      setLeft(sec);
      setName(exName);
      setPaused(false);
      setShow(true);
    });
  }, [registerStart]);

  useEffect(() => {
    if (!show || paused) return;
    intervalRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          try {
            (navigator as Navigator & { vibrate?: (p: number[]) => void }).vibrate?.([120, 60, 120]);
          } catch {}
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [show, paused]);

  const done = show && left === 0;
  const m = Math.floor(Math.max(left, 0) / 60);
  const s = Math.max(left, 0) % 60;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-2rem)] max-w-2xl translate-y-32 opacity-0 transition-all",
        show && "pointer-events-auto translate-y-0 opacity-100",
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-lg sm:flex-row sm:items-center", done && "border-primary/70")}>
        <div className="flex items-center gap-3">
          <div className={cn("min-w-16 text-3xl font-semibold tabular-nums", done ? "text-primary" : "text-foreground")}>
            {m}:{String(s).padStart(2, "0")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{done ? "Go!" : `${name} - rest`}</p>
            <p className="text-xs text-muted-foreground">{done ? "next set" : "recover and reset"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-11 flex-1 sm:flex-none" onClick={() => setShow(false)} aria-label="Close timer">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
