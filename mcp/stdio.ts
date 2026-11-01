#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { authFromPat } from "./auth";
import { staticBackendProvider } from "./backend";
import { createConvexBackend } from "./convex";
import { createStrongMcpServer } from "./server";

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const token = process.env.STRONG_MCP_TOKEN;

if (!convexUrl) {
  console.error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL");
  process.exit(1);
}
if (!token) {
  console.error("Missing STRONG_MCP_TOKEN (create one in Settings → MCP)");
  process.exit(1);
}

const backend = createConvexBackend(convexUrl, authFromPat(token));
const server = createStrongMcpServer(staticBackendProvider(backend));
const transport = new StdioServerTransport();
await server.connect(transport);
