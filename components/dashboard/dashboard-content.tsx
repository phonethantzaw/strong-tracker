"use client";

import { CalendarCheck2, Flame, Trophy, Weight } from "lucide-react";
import { useDashboardStats } from "@/app/hooks/use-dashboard-stats";
import { ActivityCalendar } from "@/components/dashboard/activity-calendar";
import { formatVolume } from "@/app/lib/stats";
import { ProgramOverview } from "@/components/dashboard/program-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardContent() {
  const stats = useDashboardStats();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide md:text-4xl">
            Dashboard
          </h1>
          <Badge variant="outline">Workout {stats.nextWorkout} up next</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track your consistency, volume, and recent progress across the 4-day program.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title="Sessions this week"
              value={String(stats.sessionsThisWeek)}
              hint="Aim for ~3 per week"
              icon={CalendarCheck2}
              index={0}
            />
            <StatCard
              title="Current streak"
              value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
              hint="Consecutive training days"
              icon={Flame}
              index={1}
            />
            <StatCard
              title="Weekly volume"
              value={`${formatVolume(stats.weeklyVolume)} lbs`}
              hint="Weight × reps this week"
              icon={Weight}
              index={2}
            />
            <StatCard
              title="All-time volume"
              value={`${formatVolume(stats.totalVolume)} lbs`}
              hint={`${stats.recentPRs.length} tracked lift PRs`}
              icon={Trophy}
              index={3}
            />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3 xl:items-stretch">
        <div className="xl:col-span-2">
          <VolumeChart data={stats.weeklyChart} loading={stats.loading} />
        </div>
        <div className="h-full">
          <ActivityCalendar loggedDates={stats.loggedDates} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <QuickActions nextWorkout={stats.nextWorkout} />
        <RecentActivity items={stats.recentActivity} loading={stats.loading} />
        <div className="xl:col-span-1">
          <ProgramOverview />
        </div>
      </section>

      {!stats.loading && stats.recentPRs.length > 0 ? (
        <section>
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Top lift PRs</CardTitle>
              <CardDescription>Best logged performance per exercise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recentPRs.map((pr) => (
                  <div key={pr.exerciseId} className="rounded-xl border bg-background/50 p-3">
                    <p className="text-sm font-medium">{pr.exerciseName}</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {pr.weight ? `${pr.weight} × ${pr.reps}` : `${pr.reps}s`}
                    </p>
                    <p className="text-xs text-muted-foreground">{pr.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
