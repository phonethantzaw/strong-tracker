import { Suspense } from "react";
import { Tracker } from "@/components/track/tracker";
import { Skeleton } from "@/components/ui/skeleton";

function TrackFallback() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide md:text-4xl">
          Track Workout
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log every set, beat last session, and save when you&apos;re done.
        </p>
      </div>
      <Suspense fallback={<TrackFallback />}>
        <Tracker />
      </Suspense>
    </div>
  );
}
