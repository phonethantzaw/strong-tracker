export type ToolErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "NOT_ACTIVE"
  | "ACTIVE_EXISTS"
  | "SET_EXISTS"
  | "AMBIGUOUS_EXERCISE"
  | "RATE_LIMITED"
  | "NEEDS_CONFIRMATION"
  | "INVALID_INPUT"
  | "FAILED";

export function okResult(text: string, data: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: data as Record<string, unknown>,
  };
}

export function toolError(code: ToolErrorCode, message: string, extra?: unknown) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: `${code}: ${message}`,
      },
    ],
    structuredContent: {
      code,
      message,
      ...(extra && typeof extra === "object" ? (extra as object) : { extra }),
    },
  };
}

export function mapConvexError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const codes: ToolErrorCode[] = [
    "UNAUTHORIZED",
    "NOT_FOUND",
    "NOT_ACTIVE",
    "ACTIVE_EXISTS",
    "SET_EXISTS",
    "RATE_LIMITED",
    "NEEDS_CONFIRMATION",
  ];
  for (const code of codes) {
    if (message.includes(code)) {
      return toolError(code, humanMessage(code));
    }
  }
  return toolError("FAILED", "Request failed. Try again.");
}

function humanMessage(code: ToolErrorCode): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Authentication failed. Check your MCP token or OAuth session.";
    case "NOT_FOUND":
      return "Resource not found for this user.";
    case "NOT_ACTIVE":
      return "No active workout, or the session is already completed/cancelled.";
    case "ACTIVE_EXISTS":
      return "An active workout already exists. Continue it, or complete/cancel it first.";
    case "SET_EXISTS":
      return "That set number is already logged. Use update_exercise_set to change it.";
    case "RATE_LIMITED":
      return "Rate limit exceeded. Wait a moment and try again.";
    case "NEEDS_CONFIRMATION":
      return "Pass confirm: true after the user confirms.";
    default:
      return "Request failed.";
  }
}
