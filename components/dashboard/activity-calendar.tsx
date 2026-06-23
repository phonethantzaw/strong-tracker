"use client";

import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityCalendarProps = {
  loggedDates: string[];
};

export function ActivityCalendar({ loggedDates }: ActivityCalendarProps) {
  const { monthLabel, loggedDateObjects } = useMemo(() => {
    const now = new Date();
    const dates = loggedDates.map((date) => new Date(`${date}T12:00:00`));
    return {
      monthLabel: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      loggedDateObjects: dates,
    };
  }, [loggedDates]);

  return (
    <Card className="flex h-full flex-col border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Training calendar</CardTitle>
        <CardDescription className="mt-0">{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-start">
        <Calendar
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
      </CardContent>
    </Card>
  );
}
