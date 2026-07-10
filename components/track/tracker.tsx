"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DAYS, PLAN, RULES, type Day, type Mode } from "@/app/lib/plan";
import { ExerciseCard, RestTimer, startTimerRef } from "@/components/track/exercise-card";
import type { Draft, SetEntry } from "@/components/track/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const todayStr = () => toLocalDateKey(new Date());

function emptyDraft(): Draft {
  const d: Draft = {};
  DAYS.forEach((day) => {
    PLAN[day].ex.forEach((e) => {
      d[e.id] = Array.from({ length: e.sets }, () => ({ weight: "", reps: "" }));
    });
  });
  return d;
}

export function Tracker() {
  const searchParams = useSearchParams();
  const sessions = useQuery(api.sessions.listMine);
  const save = useMutation(api.sessions.save);

  const dayParam = searchParams.get("day");
  const initialDay = (DAYS.includes(dayParam as Day) ? dayParam : "A") as Day;
  const [day, setDay] = useState<Day>(initialDay);
  const [mode, setMode] = useState<Mode>("std");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const plan = PLAN[day];

  useEffect(() => {
    const nextDay = searchParams.get("day");
    if (DAYS.includes(nextDay as Day)) setDay(nextDay as Day);
  }, [searchParams]);

  const lastFor = useMemo(() => {
    return (exId: string) => {
      if (!sessions) return null;
      for (const s of sessions) {
        const e = s.entries[exId];
        if (e && e.some((x) => x.weight || x.reps)) return { date: s.date, sets: e };
      }
      return null;
    };
  }, [sessions]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function updateSet(exId: string, idx: number, field: keyof SetEntry, val: string) {
    setDraft((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));
    setJustSaved(false);
  }

  function toggleCard(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const loggedCount = plan.ex.filter((e) => (draft[e.id] || []).some((s) => s.weight || s.reps)).length;

  async function handleSave() {
    const entries: Draft = {};
    let any = false;
    plan.ex.forEach((e) => {
      entries[e.id] = draft[e.id] || [];
      if (entries[e.id].some((s) => s.weight || s.reps)) any = true;
    });
    if (!any) {
      showToast("Log at least one set first");
      return;
    }
    setSaving(true);
    try {
      await save({ date: todayStr(), day, mode, entries });
      setJustSaved(true);
      showToast("Session saved");
    } catch {
      showToast("Save failed - try again");
    } finally {
      setSaving(false);
    }
  }

  if (sessions === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <Card className="border-border/70">
        <CardHeader className="space-y-4 px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-[family-name:var(--font-anton)] text-2xl uppercase tracking-wide sm:text-3xl md:text-4xl">
              {plan.title}
            </CardTitle>
            <Badge variant="outline" className="whitespace-normal">
              {mode === "pf" ? (
                <>
                  <span className="sm:hidden">PF</span>
                  <span className="hidden sm:inline">Planet Fitness</span>
                </>
              ) : (
                "Standard"
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{plan.focus}</p>
          <p className="text-xs text-muted-foreground">{plan.warm}</p>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Day</span>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map((d) => (
                <Button
                  key={d}
                  variant={day === d ? "default" : "outline"}
                  size="sm"
                  className="h-11 min-w-0 px-1 text-xs sm:px-3 sm:text-sm"
                  onClick={() => setDay(d)}
                >
                  <span className="sm:hidden">{d}</span>
                  <span className="hidden sm:inline">Workout {d}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Gear</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "std" ? "default" : "outline"}
                size="sm"
                className="h-11"
                onClick={() => setMode("std")}
              >
                Standard
              </Button>
              <Button
                variant={mode === "pf" ? "default" : "outline"}
                size="sm"
                className="h-11"
                onClick={() => setMode("pf")}
              >
                <span className="sm:hidden">PF</span>
                <span className="hidden sm:inline">Planet Fitness</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {loggedCount}/{plan.ex.length} logged
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {plan.ex.map((e, i) => (
          <ExerciseCard
            key={e.id}
            ex={e}
            index={i}
            mode={mode}
            open={open.has(e.id)}
            draft={draft[e.id] || []}
            last={lastFor(e.id)}
            onToggle={() => toggleCard(e.id)}
            onSet={(idx, field, val) => updateSet(e.id, idx, field, val)}
            onRest={() => startTimerRef.current?.(e.restS, e.name)}
          />
        ))}
      </div>

      <Button
        className="h-12 w-full whitespace-normal text-center leading-snug"
        size="lg"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          "Saving..."
        ) : justSaved ? (
          "Saved - nice work"
        ) : (
          <>
            <span className="hidden sm:inline">{`Save ${plan.title} · ${todayStr()}`}</span>
            <span className="sm:hidden">{`Save Workout ${day}`}</span>
          </>
        )}
      </Button>

      <Card className="border-border/70">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Program rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-6">
          {RULES.map((r) => (
            <div key={r.n} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">
                {r.n}. {r.title}
              </p>
              <p className="text-xs text-muted-foreground">{r.body}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Planet Fitness note:</span> PF dumbbells usually top out around 60-75 lbs. Workout B swaps conventional deadlifts for Smith-machine or dumbbell RDLs plus seated leg curls.
          </p>
        </CardContent>
      </Card>

      <RestTimer registerStart={(fn) => (startTimerRef.current = fn)} />
      <div
        className={cn(
          "fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border bg-card px-4 py-2 text-sm shadow transition-all",
          toast ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0",
        )}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}
