"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeDashboardStats } from "@/app/lib/stats";

export function useDashboardStats() {
  const sessions = useQuery(api.sessions.listMine);
  return useMemo(() => computeDashboardStats(sessions), [sessions]);
}
