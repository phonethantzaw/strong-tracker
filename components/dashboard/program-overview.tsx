"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { PLAN, type Day } from "@/app/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProgramOverview() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Program overview</CardTitle>
          <CardDescription>Your current A/B split and lift lineup</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="A">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="A">Workout A</TabsTrigger>
              <TabsTrigger value="B">Workout B</TabsTrigger>
            </TabsList>
            {(Object.keys(PLAN) as Day[]).map((day) => {
              const workout = PLAN[day];
              return (
                <TabsContent key={day} value={day} className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide">
                      {workout.title}
                    </h3>
                    <Badge variant="secondary">{workout.focus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{workout.warm}</p>
                  <div className="space-y-2">
                    {workout.ex.map((ex, index) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {String(index + 1).padStart(2, "0")}. {ex.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets} × {ex.reps} · rest {ex.rest}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/track?day=${day}`}>Open Workout {day}</Link>
                  </Button>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
