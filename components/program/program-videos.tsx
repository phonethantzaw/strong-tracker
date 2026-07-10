"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ProgramVideosProps = {
  sections?: "both" | "warmup" | "cooldown";
  cardTitle?: string;
};

function VideoBlock({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-lg border bg-muted/20"
      />
    </div>
  );
}

export function ProgramVideos({ sections = "both", cardTitle }: ProgramVideosProps) {
  const urls = useQuery(api.programVideos.getUrls);

  const wantsWarmup = sections === "both" || sections === "warmup";
  const wantsCooldown = sections === "both" || sections === "cooldown";

  if (urls === undefined) {
    const inner = (
      <div className="space-y-3">
        {wantsWarmup ? <Skeleton className="aspect-video w-full rounded-lg" /> : null}
        {wantsCooldown ? <Skeleton className="aspect-video w-full rounded-lg" /> : null}
      </div>
    );
    if (cardTitle) {
      return (
        <Card className="border-border/70">
          <CardHeader className="px-4 py-3 sm:px-6">
            <CardTitle className="text-base">{cardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6">{inner}</CardContent>
        </Card>
      );
    }
    return inner;
  }

  const showWarmup = wantsWarmup && urls.warmupUrl;
  const showCooldown = wantsCooldown && urls.cooldownUrl;

  if (!showWarmup && !showCooldown) return null;

  const inner = (
    <div className="space-y-3">
      {showWarmup ? <VideoBlock label="Warm-up" url={urls.warmupUrl!} /> : null}
      {showCooldown ? <VideoBlock label="Cool-down" url={urls.cooldownUrl!} /> : null}
    </div>
  );

  if (cardTitle) {
    return (
      <Card className="border-border/70">
        <CardHeader className="px-4 py-3 sm:px-6">
          <CardTitle className="text-base">{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6">{inner}</CardContent>
      </Card>
    );
  }

  return inner;
}
