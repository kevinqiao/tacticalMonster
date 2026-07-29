import type { Doc } from "../../_generated/dataModel";

export type CampaignExperienceType = "game" | "display";

export function resolveExperienceType(campaign: {
  experienceType?: CampaignExperienceType | string;
}): CampaignExperienceType {
  return campaign.experienceType === "display" ? "display" : "game";
}

export function displayCampaignDefaults(): Pick<
  Doc<"campaigns">,
  "playLimits" | "rewardRules"
> {
  return {
    playLimits: { maxCouponsPerPlayer: 0 },
    rewardRules: [],
  };
}
