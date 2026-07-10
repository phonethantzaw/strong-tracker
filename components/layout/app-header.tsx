"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Dumbbell, LayoutDashboard, PanelLeft, Search } from "lucide-react";
import { PLAN } from "@/app/lib/plan";
import { useDashboardStats } from "@/app/hooks/use-dashboard-stats";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { nudges } = useDashboardStats();

  const exercises = useMemo(
    () =>
      Object.entries(PLAN).flatMap(([day, workout]) =>
        workout.ex.map((ex) => ({
          id: ex.id,
          name: ex.name,
          day,
          href: `/track?day=${day}`,
        })),
      ),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger className="-ml-1 size-9" />
        <Separator orientation="vertical" className="mr-1 h-4" />

        <Button
          variant="outline"
          className="hidden h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground sm:flex"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left text-sm">Search workouts, lifts…</span>
          <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
            ⌘K
          </kbd>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-10 sm:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open search"
        >
          <Search className="size-4" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative size-10" aria-label="Notifications">
                <Bell className="size-4" />
                {nudges.length > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Training nudges</p>
                <p className="text-xs text-muted-foreground">Based on your recent sessions</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {nudges.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    You&apos;re all caught up.
                  </p>
                ) : (
                  nudges.map((nudge) => (
                    <button
                      key={nudge.id}
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                      onClick={() => nudge.href && router.push(nudge.href)}
                    >
                      <p className="text-sm font-medium">{nudge.title}</p>
                      <p className="text-xs text-muted-foreground">{nudge.body}</p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Navigate or jump to a lift">
        <CommandInput placeholder="Search navigation or exercises…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
            >
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/track");
              }}
            >
              <Dumbbell className="mr-2 size-4" />
              Track Workout
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/history");
              }}
            >
              <PanelLeft className="mr-2 size-4" />
              History
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Exercises">
            {exercises.map((ex) => (
              <CommandItem
                key={ex.id}
                onSelect={() => {
                  setOpen(false);
                  router.push(ex.href);
                }}
              >
                <Badge variant="outline" className="mr-2">
                  {ex.day}
                </Badge>
                {ex.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
