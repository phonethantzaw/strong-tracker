import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  authFromPat,
  authFromService,
  authInfoFromPat,
  isPatToken,
} from "@/mcp/auth";
import type { BackendProvider } from "@/mcp/backend";
import { createConvexBackend } from "@/mcp/convex";
import { registerStrongTools, SERVER_INSTRUCTIONS } from "@/mcp/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function verifyPat(token: string): Promise<AuthInfo | undefined> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return undefined;
  const client = new ConvexHttpClient(convexUrl);
  const resolved = await client.query(api.mcpTokens.resolvePat, { token });
  if (!resolved?.userId) return undefined;
  return authInfoFromPat(token, resolved.userId);
}

async function verifyToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  if (isPatToken(bearerToken)) {
    return verifyPat(bearerToken);
  }

  try {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    const info = await verifyClerkToken(clerkAuth, bearerToken);
    if (!info) return undefined;
    const userId = (info.extra?.userId as string | undefined) ?? info.clientId;
    if (!userId) return undefined;
    return {
      ...info,
      extra: { ...info.extra, userId, authKind: "oauth" },
    };
  } catch {
    return undefined;
  }
}

const httpBackendProvider: BackendProvider = {
  get(authInfo) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const serviceSecret = process.env.MCP_SERVICE_SECRET;
    if (!convexUrl) throw new Error("FAILED");
    if (!authInfo?.token) throw new Error("UNAUTHORIZED");

    if (isPatToken(authInfo.token) || authInfo.extra?.authKind === "pat") {
      return createConvexBackend(convexUrl, authFromPat(authInfo.token));
    }

    const userId = authInfo.extra?.userId as string | undefined;
    if (!userId || !serviceSecret) throw new Error("UNAUTHORIZED");
    return createConvexBackend(
      convexUrl,
      authFromService(userId, serviceSecret),
    );
  },
};

const handler = createMcpHandler(
  (server) => {
    registerStrongTools(server, httpBackendProvider);
  },
  {
    serverInfo: {
      name: "strong-tracker",
      version: "1.0.0",
    },
    instructions: SERVER_INSTRUCTIONS,
  },
);

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
