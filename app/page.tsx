"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, SignOutButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { api } from "../convex/_generated/api";
import { PLAN, RULES, type Day, type Mode, type Exercise } from "./lib/plan";

type SetEntry = { weight: string; reps: string };
type Draft = Record<string, SetEntry[]>;

const todayStr = () => new Date().toISOString().slice(0, 10);

function emptyDraft(): Draft {
  const d: Draft = {};
  (Object.keys(PLAN) as Day[]).forEach((day) => {
    PLAN[day].ex.forEach((e) => {
      d[e.id] = Array.from({ length: e.sets }, () => ({ weight: "", reps: "" }));
    });
  });
  return d;
}

function fmtSets(sets: SetEntry[], hint: string) {
  return sets
    .filter((s) => s.weight || s.reps)
    .map((s) =>
      hint === "sec"
        ? `${s.reps || "?"}s${s.weight ? ` +${s.weight}` : ""}`
        : `${s.weight || "–"}×${s.reps || "–"}`,
    )
    .join("  ·  ");
}

export default function Page() {
  return (
    <>
      <AuthLoading>
        <div className="loading">Loading…</div>
      </AuthLoading>
      <Unauthenticated>
        <Gate />
      </Unauthenticated>
      <Authenticated>
        <Tracker />
      </Authenticated>
    </>
  );
}

function Gate() {
  return (
    <div className="gate">
      <div className="card2">
        <h1>
          Strong<span className="slash">.</span>
        </h1>
        <p>Your 3-day A/B strength program. Log every set, beat last week, watch the numbers climb.</p>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="signin">Sign in to start</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <p className="sync">Connecting your account…</p>
          <SignOutButton>
            <button className="signin ghost">Sign out and try again</button>
          </SignOutButton>
        </SignedIn>
      </div>
    </div>
  );
}

function Tracker() {
  const sessions = useQuery(api.sessions.listMine);
  const save = useMutation(api.sessions.save);

  const [day, setDay] = useState<Day>("A");
  const [mode, setMode] = useState<Mode>("std");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const plan = PLAN[day];

  // Most recent logged numbers for a given exercise across all saved sessions.
  const lastFor = useMemo(() => {
    return (exId: string) => {
      if (!sessions) return null;
      for (const s of sessions) {
        const e = s.entries[exId];
        if (e && e.some((x) => x.weight || x.reps)) {
          return { date: s.date, sets: e };
        }
      }
      return null;
    };
  }, [sessions]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function updateSet(exId: string, idx: number, field: keyof SetEntry, val: string) {
    setDraft((prev) => {
      const next = { ...prev, [exId]: prev[exId].map((s, i) => (i === idx ? { ...s, [field]: val } : s)) };
      return next;
    });
    setJustSaved(false);
  }

  function toggleCard(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
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
      showToast("Session saved 💪");
    } catch {
      showToast("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <h1>
            Strong<span className="slash">.</span>
          </h1>
          <div className="right">
            <span className="tag">A · B Split</span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <div className="modebar">
          <span className="lbl">Day</span>
          <button className={`pill ${day === "A" ? "active" : ""}`} onClick={() => setDay("A")}>
            Workout A
          </button>
          <button className={`pill ${day === "B" ? "active" : ""}`} onClick={() => setDay("B")}>
            Workout B
          </button>
        </div>

        <div className="modebar">
          <span className="lbl">Gear</span>
          <button className={`pill ghost ${mode === "std" ? "active" : ""}`} onClick={() => setMode("std")}>
            Standard
          </button>
          <button className={`pill ghost ${mode === "pf" ? "active" : ""}`} onClick={() => setMode("pf")}>
            Planet Fitness
          </button>
        </div>

        <div className="daydate">
          <span className="date">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </span>
          <span className="date">{loggedCount}/{plan.ex.length} logged · save below</span>
        </div>
      </header>

      <main>
        <div className="dayhead">
          <div className="kicker">{mode === "pf" ? "Planet Fitness build" : "Standard build"}</div>
          <h2>{plan.title}</h2>
          <div className="meta">
            <span>
              <b>{plan.focus}</b>
            </span>
            <span>{plan.ex.length} lifts</span>
            <span>~45–60 min</span>
          </div>
          <div className="warmup">{plan.warm}</div>
        </div>

        {plan.ex.map((e, i) => (
          <Card
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

        <div className="cfooter" style={{ marginTop: 18 }}>
          <button
            className={`btn save ${justSaved ? "saved" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : justSaved ? "✓ Saved — nice work" : `Save ${plan.title} · ${todayStr()}`}
          </button>
        </div>
      </main>

      <section className="rules">
        <h3>The 3 rules that make this work</h3>
        {RULES.map((r) => (
          <div className="rule" key={r.n}>
            <div className="rn">{r.n}</div>
            <div className="rt">
              <b>{r.title}</b>
              <span>{r.body}</span>
            </div>
          </div>
        ))}
        <div className="pfnote">
          <b>Planet Fitness note:</b> PF dumbbells usually only go up to ~60–75 lbs, which is plenty for everything
          here. The only true gap is the conventional deadlift — flip to <b>Planet Fitness</b> gear mode and Workout B
          swaps it for Smith-machine / dumbbell Romanian deadlifts plus seated leg curls.
        </div>
      </section>

      <footer>
        Synced to your account across devices.
        <br />
        A → B → A, then B → A → B · ~3 days/week
      </footer>

      <RestTimer registerStart={(fn) => (startTimerRef.current = fn)} />

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}

// ---- Exercise card ----
function Card({
  ex,
  index,
  mode,
  open,
  draft,
  last,
  onToggle,
  onSet,
  onRest,
}: {
  ex: Exercise;
  index: number;
  mode: Mode;
  open: boolean;
  draft: SetEntry[];
  last: { date: string; sets: SetEntry[] } | null;
  onToggle: () => void;
  onSet: (idx: number, field: keyof SetEntry, val: string) => void;
  onRest: () => void;
}) {
  const done = draft.some((s) => s.weight || s.reps);
  const repLabel = ex.repField === "sec" ? "Sec" : "Reps";
  const repPlaceholder = (ex.reps.match(/^[0-9–/]+/)?.[0]) || "–";

  return (
    <div className={`card ${done ? "done" : ""} ${open ? "open" : ""}`}>
      <div className="chead" onClick={onToggle}>
        <div className="num">{String(index + 1).padStart(2, "0")}</div>
        <div className="ctitle">
          <div className="name">{ex.name}</div>
          <div className="scheme">
            {ex.sets} <span className="x">×</span> {ex.reps} &nbsp;·&nbsp; rest {ex.rest}
          </div>
          {mode === "pf" && ex.pf ? <div className="swap">→ {ex.pf}</div> : null}
        </div>
        <div className="chk">✓</div>
        <div className="caret">▾</div>
      </div>

      {open && (
        <div className="cbody">
          <div className="last">
            {last ? (
              <>
                Last ({last.date}): <b>{fmtSets(last.sets, ex.hint) || "–"}</b>
              </>
            ) : (
              <span className="none">No history yet — log your first session.</span>
            )}
          </div>

          <table className="sets">
            <thead>
              <tr>
                <th></th>
                <th>Weight ({ex.hint})</th>
                <th>{repLabel}</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((s, idx) => (
                <tr key={idx}>
                  <td className="setno">{idx + 1}</td>
                  <td>
                    <input
                      inputMode="numeric"
                      placeholder={ex.hint}
                      value={s.weight}
                      onChange={(ev) => onSet(idx, "weight", ev.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      placeholder={repPlaceholder}
                      value={s.reps}
                      onChange={(ev) => onSet(idx, "reps", ev.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ex.note ? <div className="note">⚑ {ex.note}</div> : null}

          <div className="cfooter">
            <button className="btn rest" onClick={onRest}>
              ⏱ Rest {ex.rest}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// allow Card -> Tracker to trigger the timer
const startTimerRef: { current: ((sec: number, name: string) => void) | null } = { current: null };

// ---- Rest timer ----
function RestTimer({ registerStart }: { registerStart: (fn: (sec: number, name: string) => void) => void }) {
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
    <div className={`timer ${show ? "show" : ""} ${done ? "done" : ""}`}>
      <div className="inner">
        <div className="tnum">
          {m}:{String(s).padStart(2, "0")}
        </div>
        <div className="tlbl">
          <b>{done ? "Go!" : `${name} — rest`}</b>
          <span>{done ? "next set" : "recover & reset"}</span>
        </div>
        <button onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        <button className="x" onClick={() => setShow(false)}>
          ✕
        </button>
      </div>
    </div>
  );
}
