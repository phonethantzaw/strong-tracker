"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatVolume, sessionLiftCount, sessionVolume } from "@/app/lib/stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const sessions = useQuery(api.sessions.listMine);
  const remove = useMutation(api.sessions.remove);
  const [pendingId, setPendingId] = useState<Id<"sessions"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!pendingId) return;
    setDeleting(true);
    try {
      await remove({ id: pendingId });
      setPendingId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
      <section className="space-y-2">
        <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide md:text-4xl">
          History
        </h1>
        <p className="text-sm text-muted-foreground">Review past sessions or remove incorrect logs.</p>
      </section>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>All sessions</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium">No sessions logged yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Your saved workouts will appear here.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/track">Start tracking</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="flex flex-col gap-3 rounded-xl border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">Workout {session.day}</p>
                      <Badge variant="outline">{session.mode === "pf" ? "Planet Fitness" : "Standard"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.date} · {sessionLiftCount(session)} lifts · {formatVolume(sessionVolume(session))} lbs
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/track?day=${session.day}`}>Open tracker</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingId(session._id)}
                      aria-label={`Delete session from ${session.date}`}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pendingId !== null} onOpenChange={(open) => !open && setPendingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session?</DialogTitle>
            <DialogDescription>
              This permanently removes the session from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
