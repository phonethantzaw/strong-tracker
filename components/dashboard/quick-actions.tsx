"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, Dumbbell, History } from "lucide-react";
import { DAYS, PLAN, type Day } from "@/app/lib/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QuickActionsProps = {
  nextWorkout: Day;
};

export function QuickActions({ nextWorkout }: QuickActionsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Jump straight into training</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          <Button asChild className="h-auto justify-start gap-3 px-4 py-4">
            <Link href={`/track?day=${nextWorkout}`} className="flex w-full min-w-0 items-start gap-3 text-left">
              <Dumbbell className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block break-words text-sm font-medium leading-snug">Start Workout {nextWorkout}</span>
                <span className="block break-words text-xs leading-snug opacity-80">Suggested next session</span>
              </span>
            </Link>
          </Button>
          {DAYS.map((day) => (
            <Button key={day} asChild variant="secondary" className="h-auto justify-start gap-3 px-4 py-4">
              <Link href={`/track?day=${day}`} className="flex w-full min-w-0 items-start gap-3 text-left">
                <CalendarDays className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 text-left">
                  <span className="block break-words text-sm font-medium leading-snug">Log {PLAN[day].title}</span>
                  <span className="block break-words text-xs leading-snug opacity-80">{PLAN[day].focus}</span>
                </span>
              </Link>
            </Button>
          ))}
          <Button asChild variant="outline" className="h-auto justify-start gap-3 px-4 py-4">
            <Link href="/history" className="flex w-full min-w-0 items-start gap-3 text-left">
              <History className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block break-words text-sm font-medium leading-snug">Session history</span>
                <span className="block break-words text-xs leading-snug opacity-80">Review or delete past logs</span>
              </span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
