import { query } from "./_generated/server";

export const getUrls = query({
  args: {},
  handler: async () => {
    return {
      warmupUrl: process.env.WARMUP_VIDEO_URL ?? null,
      cooldownUrl: process.env.COOLDOWN_VIDEO_URL ?? null,
    };
  },
});
