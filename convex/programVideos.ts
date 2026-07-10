import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getUrls = query({
  args: {},
  handler: async (ctx) => {
    const warmupId = process.env.WARMUP_VIDEO_ID;
    const cooldownId = process.env.COOLDOWN_VIDEO_ID;

    return {
      warmupUrl: warmupId
        ? await ctx.storage.getUrl(warmupId as Id<"_storage">)
        : null,
      cooldownUrl: cooldownId
        ? await ctx.storage.getUrl(cooldownId as Id<"_storage">)
        : null,
    };
  },
});
