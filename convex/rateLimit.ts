import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  mcpWrite: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 20 },
  mcpRead: { kind: "token bucket", rate: 120, period: MINUTE, capacity: 40 },
});
