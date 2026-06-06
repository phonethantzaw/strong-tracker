export type Exercise = {
  id: string;
  name: string;
  pf: string;
  sets: number;
  reps: string;
  rest: string;
  restS: number;
  hint: string;
  repField?: "sec";
  note?: string;
};

export type Day = "A" | "B";
export type Mode = "std" | "pf";

export type Workout = {
  title: string;
  focus: string;
  warm: string;
  ex: Exercise[];
};

export const PLAN: Record<Day, Workout> = {
  A: {
    title: "Workout A",
    focus: "Squat-led full body",
    warm: "Warm up first: 5 min light cardio + 1–2 light sets of your first exercise.",
    ex: [
      { id: "a_squat", name: "Squat", pf: "Leg Press machine (or Smith-machine squat)", sets: 3, reps: "5–8", rest: "2–3 min", restS: 180, hint: "lbs" },
      { id: "a_bench", name: "Bench Press", pf: "Chest Press machine (or Smith-machine bench)", sets: 3, reps: "5–8", rest: "2–3 min", restS: 180, hint: "lbs" },
      { id: "a_row", name: "Bent-over Row", pf: "Seated Cable Row machine", sets: 3, reps: "6–10", rest: "1.5–2 min", restS: 120, hint: "lbs" },
      { id: "a_ohp", name: "Overhead Press", pf: "Shoulder Press machine", sets: 2, reps: "8–10", rest: "1.5 min", restS: 90, hint: "lbs" },
      { id: "a_plank", name: "Plank", pf: "Same, just on the floor", sets: 3, reps: "30–45 sec", rest: "1 min", restS: 60, hint: "sec", repField: "sec" },
    ],
  },
  B: {
    title: "Workout B",
    focus: "Deadlift-led full body",
    warm: "Warm up first: 5 min light cardio + 1–2 light sets of your first exercise.",
    ex: [
      {
        id: "b_dl",
        name: "Deadlift",
        pf: "Smith-machine or DB Romanian deadlift + Seated Leg Curl",
        sets: 3,
        reps: "5",
        rest: "2–3 min",
        restS: 180,
        hint: "lbs",
        note: "PF can't do conventional deadlifts traditionally. Use the Smith machine for Romanian deadlifts, or do dumbbell RDLs, then pair with the Seated Leg Curl machine to cover your hamstrings.",
      },
      { id: "b_incline", name: "Incline Dumbbell Press", pf: "Keep it (PF has dumbbells) or use the incline / chest-press machine", sets: 3, reps: "8–10", rest: "2 min", restS: 120, hint: "lbs" },
      { id: "b_lat", name: "Lat Pulldown or Pull-up", pf: "PF has this — use it as written", sets: 3, reps: "6–10", rest: "1.5–2 min", restS: 120, hint: "lbs" },
      { id: "b_lunge", name: "Dumbbell Lunges", pf: "Keep with dumbbells, or use the Leg Press", sets: 3, reps: "10 / leg", rest: "1.5 min", restS: 90, hint: "lbs" },
      { id: "b_arms", name: "Bicep Curl + Tricep Pushdown", pf: "Cable machine + dumbbells — both available", sets: 2, reps: "10–12 each", rest: "1 min", restS: 60, hint: "lbs" },
    ],
  },
};

export const RULES = [
  {
    n: 1,
    title: "Progressive overload",
    body: "Each week, beat last week — one more rep, or a little more weight. Write it down every session. This is what actually builds muscle.",
  },
  {
    n: 2,
    title: "Form before weight",
    body: "A clean rep with less weight beats a sloppy heavy one. If your form breaks down, the set is over — drop the load and keep it strict.",
  },
  {
    n: 3,
    title: "Consistency & recovery",
    body: "Hit your sessions regularly and give muscles ~48h before training them again. Sleep and protein are part of the program, not extras.",
  },
];
