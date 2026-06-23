"use client";

import { SignInButton, SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Gate() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 bg-card/90 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="font-[family-name:var(--font-anton)] text-5xl uppercase tracking-wide">
            Strong<span className="text-primary">.</span>
          </CardTitle>
          <CardDescription>
            Your 3-day A/B strength program. Log every set, beat last week, and watch the numbers climb.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="w-full" size="lg" type="button">
                Sign in to start
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <p className="pb-2 text-center text-sm text-muted-foreground">Connecting your account...</p>
            <SignOutButton>
              <Button className="w-full" variant="outline" type="button">
                Sign out and try again
              </Button>
            </SignOutButton>
          </SignedIn>
        </CardContent>
      </Card>
    </div>
  );
}
