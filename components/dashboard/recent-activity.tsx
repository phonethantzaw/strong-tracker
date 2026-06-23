"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Dumbbell } from "lucide-react";
import type { ActivityItem } from "@/app/lib/stats";
import { formatVolume } from "@/app/lib/stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type RecentActivityProps = {
  items: ActivityItem[];
  loading?: boolean;
};

export function RecentActivity({ items, loading }: RecentActivityProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="h-full border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest logged sessions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sessions…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Dumbbell className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No sessions yet</p>
                <p className="text-xs text-muted-foreground">Log your first workout to see activity here.</p>
              </div>
              <Button asChild size="sm">
                <Link href="/track">Start tracking</Link>
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Workout {item.day}</p>
                        <Badge variant="outline">{item.mode === "pf" ? "PF" : "STD"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.date} · {item.liftCount} lifts · {formatVolume(item.volume)} lbs
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/track?day=${item.day}`}>Open</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
