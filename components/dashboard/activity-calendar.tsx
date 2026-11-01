"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatVolume, type ActivityItem } from "@/app/lib/stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityCalendarProps = {
  loggedDates: string[];
  activityByDate: Record<string, ActivityItem[]>;
};

function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ActivityCalendar({ loggedDates, activityByDate }: ActivityCalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());

  const { monthLabel, loggedDateObjects } = useMemo(() => {
    const now = new Date();
    const dates = loggedDates.map((date) => new Date(`${date}T12:00:00`));
    return {
      monthLabel: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      loggedDateObjects: dates,
    };
  }, [loggedDates]);

  const selectedKey = selected ? toDateKey(selected) : null;
  const dayItems = selectedKey ? (activityByDate[selectedKey] ?? []) : [];
  const selectedLabel = selected?.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="flex h-full flex-col border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Training calendar</CardTitle>
        <CardDescription className="mt-0">{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          showOutsideDays={false}
          className="w-full rounded-lg border p-2"
          classNames={{
            root: "w-full",
            month: "w-full",
            month_grid: "w-full",
            weekdays: "grid grid-cols-7",
            week: "grid grid-cols-7",
          }}
          modifiers={{ logged: loggedDateObjects }}
          modifiersClassNames={{
            logged:
              "relative [&_button]:text-foreground after:absolute after:bottom-1.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
          }}
        />
        {selected ? (
          <div className="rounded-lg border bg-background/50 p-3">
            <p className="text-sm font-medium">{selectedLabel}</p>
            {dayItems.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Rest day · no session logged</p>
            ) : (
              <div className="mt-2 space-y-2">
                {dayItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Workout {item.day}</p>
                        <Badge variant="outline">{item.mode === "pf" ? "PF" : "STD"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.liftCount} lifts · {formatVolume(item.volume)} lbs
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/track?day=${item.day}`}>Open</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
