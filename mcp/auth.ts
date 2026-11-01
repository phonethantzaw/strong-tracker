import type { AuthInfo } from "@modelcontextprotocol/server";
import type { McpAuthPayload } from "./types";

export function isPatToken(token: string): boolean {
  return token.startsWith("strong_pat_");
}

export function authFromPat(token: string): McpAuthPayload {
  return { kind: "pat", token };
}

export function authFromService(userId: string, secret: string): McpAuthPayload {
  return { kind: "service", secret, userId };
}

export function authInfoFromPat(token: string, userId: string): AuthInfo {
  return {
    token,
    clientId: userId,
    scopes: ["strong:read", "strong:write"],
    extra: { userId, authKind: "pat" },
  };
}

export function authPayloadFromAuthInfo(
  authInfo: AuthInfo | undefined,
  serviceSecret: string | undefined,
): McpAuthPayload {
  if (!authInfo?.token) throw new Error("UNAUTHORIZED");
  const kind = authInfo.extra?.authKind;
  if (kind === "pat" || isPatToken(authInfo.token)) {
    return authFromPat(authInfo.token);
  }
  const userId = authInfo.extra?.userId as string | undefined;
  if (!userId || !serviceSecret) throw new Error("UNAUTHORIZED");
  return authFromService(userId, serviceSecret);
}
