"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function McpSettingsPage() {
  const tokens = useQuery(api.mcpTokens.listMine);
  const create = useMutation(api.mcpTokens.create);
  const revoke = useMutation(api.mcpTokens.revoke);
  const [name, setName] = useState("Cursor / Grok");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const result = await create({ name });
      setFreshToken(result.token);
      setName("Cursor / Grok");
    } catch {
      setError("Could not create token. Try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: Id<"mcpTokens">) {
    await revoke({ id });
  }

  async function copyToken() {
    if (!freshToken) return;
    await navigator.clipboard.writeText(freshToken);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
      <section className="space-y-2">
        <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide md:text-4xl">
          MCP Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Create personal access tokens so AI agents can log workouts to your
          STRONG account. Tokens are shown once.
        </p>
      </section>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Create token
          </CardTitle>
          <CardDescription>
            Use as{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              Authorization: Bearer strong_pat_…
            </code>{" "}
            for remote MCP, or set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              STRONG_MCP_TOKEN
            </code>{" "}
            for local stdio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name"
              maxLength={80}
            />
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create token"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {freshToken ? (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm font-medium">
                Copy this token now. It will not be shown again.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block max-w-full flex-1 overflow-x-auto rounded bg-background px-2 py-2 text-xs">
                  {freshToken}
                </code>
                <Button variant="secondary" size="sm" onClick={copyToken}>
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Active tokens</CardTitle>
          <CardDescription>Revoke any token you no longer use.</CardDescription>
        </CardHeader>
        <CardContent>
          {tokens === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tokens yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token._id}
                  className="flex flex-col gap-3 rounded-xl border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{token.name}</p>
                      <Badge variant="outline">{token.prefix}…</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {new Date(token.createdAt).toLocaleString()}
                      {token.lastUsedAt
                        ? ` · Last used ${new Date(token.lastUsedAt).toLocaleString()}`
                        : " · Never used"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(token._id)}
                  >
                    <Trash2 className="size-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
