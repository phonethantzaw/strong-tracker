"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { WeeklyVolumePoint } from "@/app/lib/stats";
import { formatVolume } from "@/app/lib/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  volume: {
    label: "Volume",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type VolumeChartProps = {
  data: WeeklyVolumePoint[];
  loading?: boolean;
};

export function VolumeChart({ data, loading }: VolumeChartProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="h-full border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Weekly volume</CardTitle>
          <CardDescription>Total weight × reps logged over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Loading chart…
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
              <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-volume)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-volume)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">{formatVolume(Number(value))} lbs</span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-volume)"
                  fill="url(#volumeFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
