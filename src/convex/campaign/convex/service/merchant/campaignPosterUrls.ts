import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

type CampaignPosterFields = Pick<
  Doc<"campaigns">,
  "posterStorageId" | "posterPortraitStorageId" | "posterLandscapeStorageId"
>;

export function resolvePosterStorageIds(
  campaign: CampaignPosterFields
): {
  portrait: Id<"_storage"> | null;
  landscape: Id<"_storage"> | null;
} {
  const legacy = campaign.posterStorageId ?? null;
  const portrait = campaign.posterPortraitStorageId ?? legacy;
  const landscape =
    campaign.posterLandscapeStorageId ?? legacy ?? campaign.posterPortraitStorageId ?? null;
  return { portrait, landscape };
}

export function hasAnyCampaignPoster(campaign: CampaignPosterFields): boolean {
  const { portrait, landscape } = resolvePosterStorageIds(campaign);
  return Boolean(portrait || landscape);
}

export async function resolveCampaignPosterUrls(
  ctx: { storage: QueryCtx["storage"] },
  campaign: CampaignPosterFields
): Promise<{
  posterUrl: string | null;
  posterPortraitUrl: string | null;
  posterLandscapeUrl: string | null;
}> {
  const { portrait, landscape } = resolvePosterStorageIds(campaign);
  const [posterPortraitUrl, posterLandscapeUrl] = await Promise.all([
    portrait ? ctx.storage.getUrl(portrait) : Promise.resolve(null),
    landscape ? ctx.storage.getUrl(landscape) : Promise.resolve(null),
  ]);
  return {
    posterPortraitUrl,
    posterLandscapeUrl,
    posterUrl: posterPortraitUrl ?? posterLandscapeUrl,
  };
}
